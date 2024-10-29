use fuser::{
    BackgroundSession, FileAttr, FileType, Filesystem, MountOption, ReplyAttr, ReplyData,
    ReplyDirectory, ReplyEntry, Request,
};
use futures::executor::block_on;
use libc::{EEXIST, ENOENT};
use std::ffi::OsStr;
use std::fs::{File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::Path;
use std::time::{Duration, UNIX_EPOCH};

use crate::util::RequestPool;

const TTL: Duration = Duration::from_secs(60 * 60); // 1 hour
const PERM: u16 = 0o777;

struct YFS {
    endpoint_id: i32,
    db_pool: RequestPool,

    uid: u32,
    gid: u32,
}

// TODO! most input parameters are currently ignored!
impl Filesystem for YFS {
    fn lookup(&mut self, _req: &Request, parent: u64, name: &OsStr, reply: ReplyEntry) {
        #[derive(sqlx::FromRow, Debug)]
        struct StorageEntry {
            id: i64,
            entry_type: String,
            size_bytes: Option<i64>,
        }

        let adjusted_parent_ino = parent as i64 - 1;

        let name = name.to_string_lossy();
        let separator = name.rfind('.').unwrap_or(name.len());

        // TODO! extensions are ignored at the moment
        let (target_name, target_extension) = name.split_at(separator);

        let entry_result = if adjusted_parent_ino == 0 {
            block_on(
                sqlx::query_as::<_, StorageEntry>(
                    "SELECT id, name, extension, size_bytes, entry_type::TEXT FROM storage_entries WHERE endpoint_id = $1 AND parent_folder IS NULL AND name = $2",
                )
                .bind(self.endpoint_id)
                .bind(target_name)
                .fetch_one(&self.db_pool),
            )
        } else {
            block_on(
                sqlx::query_as::<_, StorageEntry>(
                    "SELECT id, name, extension, size_bytes, entry_type::TEXT FROM storage_entries WHERE endpoint_id = $1 AND parent_folder = $2 AND name = $3",
                )
                .bind(self.endpoint_id)
                .bind(adjusted_parent_ino)
                .bind(target_name)
                .fetch_one(&self.db_pool),
            )
        };

        if let Ok(entry) = entry_result {
            let blocksize = 512;
            let size_bytes = entry.size_bytes.unwrap_or(0) as u64;

            let kind = if entry.entry_type == "file" {
                FileType::RegularFile
            } else {
                FileType::Directory
            };

            let size_blocks = if kind == FileType::RegularFile {
                (size_bytes + blocksize - 1) / blocksize
            } else {
                0
            };

            reply.entry(
                &TTL,
                &FileAttr {
                    ino: entry.id as u64 + 1,
                    size: size_bytes,
                    blocks: size_blocks,
                    atime: UNIX_EPOCH,
                    mtime: UNIX_EPOCH,
                    ctime: UNIX_EPOCH,
                    crtime: UNIX_EPOCH,
                    kind,
                    perm: PERM,
                    nlink: 1,
                    uid: self.uid,
                    gid: self.gid,
                    rdev: 0,
                    flags: 0,
                    blksize: 512,
                },
                0,
            );
        } else {
            reply.error(ENOENT);
        }
    }

    fn getattr(&mut self, _req: &Request, ino: u64, _fh: Option<u64>, reply: ReplyAttr) {
        let adjusted_ino = ino as i64 - 1;

        if adjusted_ino == 0 {
            reply.attr(
                &TTL,
                &FileAttr {
                    ino: 1,
                    size: 0,
                    blocks: 0,
                    atime: UNIX_EPOCH,
                    mtime: UNIX_EPOCH,
                    ctime: UNIX_EPOCH,
                    crtime: UNIX_EPOCH,
                    kind: FileType::Directory,
                    perm: PERM,
                    nlink: 1,
                    uid: self.uid,
                    gid: self.gid,
                    rdev: 0,
                    flags: 0,
                    blksize: 512,
                },
            )
        } else {
            #[derive(sqlx::FromRow, Debug)]
            struct StorageEntry {
                id: i64,
                entry_type: String,
                base_path: String,
                filesystem_id: Option<String>,
            }

            // TODO! won't work for root entries
            let entry_result = block_on(
                sqlx::query_as::<_, StorageEntry>(
                    "SELECT storage_entries.id, storage_entries.filesystem_id, storage_entries.entry_type::TEXT, storage_endpoints.base_path FROM storage_entries RIGHT OUTER JOIN storage_endpoints ON storage_entries.endpoint_id = storage_endpoints.id WHERE storage_entries.endpoint_id = $1 AND storage_entries.id = $2",
                )
                .bind(self.endpoint_id)
                .bind(adjusted_ino)
                .fetch_one(&self.db_pool),
            );

            if let Ok(entry) = entry_result {
                let is_file = entry.entry_type == "file";

                let kind;
                let size_bytes;
                let size_blocks;
                let blocksize: u32 = 512;

                if is_file {
                    // TODO maybe just return entry.size_bytes instead of opening the file
                    // and actually reading the size
                    kind = FileType::RegularFile;

                    let filesystem_id = entry.filesystem_id.unwrap();

                    let file_path = Path::new(&entry.base_path).join(&filesystem_id);
                    let file = File::open(&file_path).unwrap();

                    size_bytes = file.metadata().unwrap().len();

                    size_blocks = (size_bytes + blocksize as u64 - 1) / blocksize as u64
                } else {
                    kind = FileType::Directory;
                    size_bytes = 0;
                    size_blocks = 0;
                }

                reply.attr(
                    &TTL,
                    &FileAttr {
                        ino: entry.id as u64 + 1,
                        size: size_bytes,
                        blocks: size_blocks,
                        atime: UNIX_EPOCH,
                        mtime: UNIX_EPOCH,
                        ctime: UNIX_EPOCH,
                        crtime: UNIX_EPOCH,
                        kind,
                        perm: PERM,
                        nlink: 1,
                        uid: self.uid,
                        gid: self.gid,
                        rdev: 0,
                        flags: 0,
                        blksize: blocksize,
                    },
                );
            } else {
                reply.error(ENOENT);
            }
        };
    }

    fn read(
        &mut self,
        _req: &Request,
        ino: u64,
        _fh: u64,
        offset: i64,
        size: u32,
        _flags: i32,
        _lock: Option<u64>,
        reply: ReplyData,
    ) {
        #[derive(sqlx::FromRow, Debug)]
        struct StorageEntry {
            filesystem_id: Option<String>,
            base_path: String,
        }

        let adjusted_ino = ino as i64 - 1;

        // TODO! Will not work for root entries
        let entry_result = block_on(
            sqlx::query_as::<_, StorageEntry>(
                "SELECT storage_entries.filesystem_id, storage_endpoints.base_path FROM storage_entries RIGHT OUTER JOIN storage_endpoints ON storage_entries.endpoint_id = storage_endpoints.id WHERE storage_entries.endpoint_id = $1 AND storage_entries.id = $2",
            )
            .bind(self.endpoint_id)
            .bind(adjusted_ino)
            .fetch_one(&self.db_pool),
        );

        if let Ok(entry) = entry_result {
            if entry.filesystem_id.is_none() {
                return reply.error(ENOENT);
            }

            let filesystem_id = entry.filesystem_id.unwrap();

            let file_path = Path::new(&entry.base_path).join(&filesystem_id);
            let mut file = File::open(&file_path).unwrap();
            let file_size = file.metadata().unwrap().len();

            let seek_result = file.seek(SeekFrom::Start(offset as u64));

            if seek_result.is_err() {
                return reply.error(ENOENT);
            }

            let buf_size = if size as u64 > file_size - offset as u64 {
                (file_size - offset as u64) as usize
            } else {
                size as usize
            };

            let mut buf = vec![0; buf_size];

            let read_result = file.read_exact(&mut buf);

            if read_result.is_ok() {
                reply.data(&buf);
            } else {
                reply.error(ENOENT);
            }
        } else {
            reply.error(ENOENT);
        }
    }

    fn readdir(
        &mut self,
        _req: &Request,
        ino: u64,
        _fh: u64,
        offset: i64,
        mut reply: ReplyDirectory,
    ) {
        #[derive(sqlx::FromRow, Debug)]
        struct StorageEntry {
            id: i64,
            name: String,
            extension: Option<String>,
            entry_type: String,
        }

        let adjusted_ino = ino as i64 - 1;

        let entries_result: Vec<StorageEntry> = if adjusted_ino == 0 {
            block_on(
                sqlx::query_as::<_, StorageEntry>(
                    "SELECT id, name, extension, entry_type::TEXT FROM storage_entries WHERE endpoint_id = $1 AND parent_folder IS NULL",
                )
                .bind(self.endpoint_id)
                .fetch_all(&self.db_pool),
            )
            .unwrap_or(vec![])
        } else {
            block_on(
                sqlx::query_as::<_, StorageEntry>(
                    "SELECT id, name, extension, entry_type::TEXT FROM storage_entries WHERE endpoint_id = $1 AND parent_folder = $2",
                )
                .bind(self.endpoint_id)
                .bind(adjusted_ino)
                .fetch_all(&self.db_pool),
            )
            .unwrap_or(vec![])
        };

        let mut entries: Vec<(u64, FileType, String)> =
            Vec::with_capacity(entries_result.len() + 2);

        entries.push((ino, FileType::Directory, ".".to_string()));

        if adjusted_ino != 0 {
            let parent_result = block_on(
                sqlx::query_scalar::<_, Option<i64>>(
                    "SELECT parent_folder FROM storage_entries WHERE endpoint_id = $1 AND id = $2",
                )
                .bind(self.endpoint_id)
                .bind(adjusted_ino)
                .fetch_one(&self.db_pool),
            );

            if !parent_result.is_err() {
                let parent_ino = parent_result.unwrap().unwrap_or(1);

                entries.push((parent_ino as u64, FileType::Directory, "..".to_string()));
            }
        };

        entries.extend(entries_result.into_iter().map(|entry| {
            let is_file = entry.entry_type == "file";

            let name = if is_file && entry.extension.is_some() {
                format!("{}.{}", entry.name, entry.extension.unwrap())
            } else {
                entry.name
            };

            (
                entry.id as u64 + 1,
                if is_file {
                    FileType::RegularFile
                } else {
                    FileType::Directory
                },
                name,
            )
        }));

        for (i, entry) in entries.into_iter().enumerate().skip(offset as usize) {
            // i + 1 means the index of the next entry
            if reply.add(entry.0, (i + 1) as i64, entry.1, entry.2) {
                break;
            }
        }
        reply.ok();
    }

    fn mkdir(
        &mut self,
        _req: &Request<'_>,
        parent: u64,
        name: &OsStr,
        _mode: u32,
        _umask: u32,
        reply: ReplyEntry,
    ) {
        let adjusted_parent_ino = parent as i64 - 1;

        // TODO! Won't work for root entries
        let mkdir_result = block_on(
            sqlx::query_scalar::<_, i64>(
                "INSERT INTO storage_entries (endpoint_id, parent_folder, name, entry_type) VALUES ($1, $2, $3, 'folder'::storage_entry_type) RETURNING id",
            )
            .bind(self.endpoint_id)
            .bind(adjusted_parent_ino)
            .bind(name.to_string_lossy())
            .fetch_one(&self.db_pool),
        );

        if let Ok(new_dir_ino) = mkdir_result {
            reply.entry(
                &TTL,
                &FileAttr {
                    ino: new_dir_ino as u64 + 1,
                    size: 0,
                    blocks: 0,
                    atime: UNIX_EPOCH,
                    mtime: UNIX_EPOCH,
                    ctime: UNIX_EPOCH,
                    crtime: UNIX_EPOCH,
                    kind: FileType::Directory,
                    perm: PERM,
                    nlink: 1,
                    uid: self.uid,
                    gid: self.gid,
                    rdev: 0,
                    flags: 0,
                    blksize: 512,
                },
                0,
            );
        } else {
            reply.error(ENOENT);
        }
    }

    fn rename(
        &mut self,
        _req: &Request<'_>,
        parent: u64,
        name: &OsStr,
        newparent: u64,
        newname: &OsStr,
        _flags: u32,
        reply: fuser::ReplyEmpty,
    ) {
        let adjusted_parent_ino = parent as i64 - 1;
        let adjusted_newparent_ino = newparent as i64 - 1;

        let old_full_name = name.to_string_lossy();
        let new_full_name = newname.to_string_lossy();

        let old_name_separator = old_full_name.rfind('.').unwrap_or(old_full_name.len());
        let new_name_separator = new_full_name.rfind('.').unwrap_or(new_full_name.len());

        let (old_name, mut old_extension) = old_full_name.split_at(old_name_separator);
        let (new_name, mut new_extension) = new_full_name.split_at(new_name_separator);

        if old_extension.len() > 0 {
            old_extension = old_extension.trim_start_matches('.');
        }

        if new_extension.len() > 0 {
            new_extension = new_extension.trim_start_matches('.');
        }

        // TODO! Won't work for root entries
        let rename_result = block_on(
            sqlx::query_scalar::<_, Option<i64>>(
                "UPDATE storage_entries SET parent_folder = $1, name = $2, extension = $3 WHERE endpoint_id = $4 AND parent_folder = $5 AND name = $6 AND extension = $7 RETURNING id",
            )
            .bind(adjusted_newparent_ino)
            .bind(new_name)
            .bind(new_extension)
            .bind(self.endpoint_id)
            .bind(adjusted_parent_ino)
            .bind(old_name)
            .bind(old_extension)
            .fetch_one(&self.db_pool),
        );

        if rename_result.is_ok() {
            reply.ok();
        } else {
            reply.error(EEXIST);
        }
    }

    fn write(
        &mut self,
        _req: &Request<'_>,
        ino: u64,
        _fh: u64,
        offset: i64,
        data: &[u8],
        _write_flags: u32,
        _flags: i32,
        _lock_owner: Option<u64>,
        reply: fuser::ReplyWrite,
    ) {
        #[derive(sqlx::FromRow, Debug)]
        struct StorageEntry {
            filesystem_id: Option<String>,
            base_path: String,
        }

        let adjusted_ino = ino as i64 - 1;

        // TODO! Will not work for root entries
        let entry_result = block_on(
            sqlx::query_as::<_, StorageEntry>(
                "SELECT storage_entries.filesystem_id, storage_endpoints.base_path FROM storage_entries RIGHT OUTER JOIN storage_endpoints ON storage_entries.endpoint_id = storage_endpoints.id WHERE storage_entries.endpoint_id = $1 AND storage_entries.id = $2",
            )
            .bind(self.endpoint_id)
            .bind(adjusted_ino)
            .fetch_one(&self.db_pool),
        );

        if let Ok(entry) = entry_result {
            if entry.filesystem_id.is_none() {
                return reply.error(ENOENT);
            }

            let filesystem_id = entry.filesystem_id.unwrap();

            let file_path = Path::new(&entry.base_path).join(&filesystem_id);
            let mut file = OpenOptions::new()
                .write(true)
                .create(false)
                .truncate(false)
                .open(&file_path)
                .unwrap();

            let seek_result = file.seek(SeekFrom::Start(offset as u64));

            if seek_result.is_err() {
                return reply.error(ENOENT);
            }

            let write_result = file.write_all(data);

            if write_result.is_ok() {
                let new_size = file.metadata().unwrap().len();

                reply.written(data.len() as u32);

                let _ = block_on(
                    sqlx::query(
                        "UPDATE storage_entries SET size_bytes = $1 WHERE endpoint_id = $2 AND id = $3",
                    )
                    .bind(new_size as i64)
                    .bind(self.endpoint_id)
                    .bind(adjusted_ino)
                    .execute(&self.db_pool),
                );
            } else {
                reply.error(ENOENT);
            }
        } else {
            dbg!(entry_result.unwrap_err());

            reply.error(ENOENT);
        }
    }
}

pub fn vfs_mount(
    endpoint_id: i32,
    mountpoint: &str,

    db_pool: RequestPool,
    executor: (u32, u32),
) -> BackgroundSession {
    let options = vec![
        MountOption::RW,
        MountOption::NoAtime,
        MountOption::NoExec,
        // MountOption::AutoUnmount,
        // MountOption::AllowRoot,
        MountOption::FSName("y".to_string()),
    ];

    let (uid, gid) = executor;

    fuser::spawn_mount2(
        YFS {
            db_pool,
            endpoint_id,
            uid,
            gid,
        },
        mountpoint,
        &options,
    )
    .unwrap()
}
