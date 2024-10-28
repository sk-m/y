use fuser::{
    BackgroundSession, FileAttr, FileType, Filesystem, MountOption, ReplyAttr, ReplyData,
    ReplyDirectory, ReplyEntry, Request,
};
use futures::executor::block_on;
use libc::ENOENT;
use log::info;
use std::env;
use std::ffi::OsStr;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;
use std::time::{Duration, UNIX_EPOCH};

use crate::util::RequestPool;

const TTL: Duration = Duration::from_secs(60 * 60); // 1 hour
const PERM: u16 = 0o0444;

struct HelloFS {
    uid: u32,
    gid: u32,
    db_pool: RequestPool,
}

impl Filesystem for HelloFS {
    fn lookup(&mut self, _req: &Request, parent: u64, name: &OsStr, reply: ReplyEntry) {
        #[derive(sqlx::FromRow, Debug)]
        struct StorageEntry {
            id: i64,
            name: String,
            extension: Option<String>,
            entry_type: String,
            size_bytes: Option<i64>,
        }

        let adjusted_parent_ino = parent as i64 - 1;

        let name = name.to_string_lossy();
        let separator = name.rfind('.').unwrap_or(name.len());

        // TODO! extensions are ignored at the moment
        let (target_name, target_extension) = name.split_at(separator);

        dbg!("lookup", adjusted_parent_ino, target_name, target_extension);

        let entry_result = if adjusted_parent_ino == 0 {
            block_on(
                sqlx::query_as::<_, StorageEntry>(
                    "SELECT id, name, extension, size_bytes, entry_type::TEXT FROM storage_entries WHERE parent_folder IS NULL AND name = $1",
                )
                .bind(target_name)
                .fetch_one(&self.db_pool),
            )
        } else {
            block_on(
                sqlx::query_as::<_, StorageEntry>(
                    "SELECT id, name, extension, size_bytes, entry_type::TEXT FROM storage_entries WHERE parent_folder = $1 AND name = $2",
                )
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
        dbg!("getattr", adjusted_ino);

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
                    nlink: 2,
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
                name: String,
                extension: Option<String>,
                entry_type: String,
                size_bytes: Option<i64>,
            }

            let entry_result = block_on(
                sqlx::query_as::<_, StorageEntry>(
                    "SELECT id, name, extension, size_bytes, entry_type::TEXT FROM storage_entries WHERE id = $1",
                )
                .bind(adjusted_ino)
                .fetch_one(&self.db_pool),
            );

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
                        blksize: 512,
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

        let entry_result = block_on(
            sqlx::query_as::<_, StorageEntry>(
                "SELECT storage_entries.filesystem_id, storage_endpoints.base_path FROM storage_entries RIGHT OUTER JOIN storage_endpoints ON storage_entries.endpoint_id = storage_endpoints.id WHERE storage_entries.id = $1",
            )
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

            dbg!("read", offset, size, buf_size);

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

        dbg!("readdir", ino, adjusted_ino);

        let entries_result: Vec<StorageEntry> = if adjusted_ino == 0 {
            block_on(
                sqlx::query_as::<_, StorageEntry>(
                    "SELECT id, name, extension, entry_type::TEXT FROM storage_entries WHERE parent_folder IS NULL",
                )
                .fetch_all(&self.db_pool),
            )
            .unwrap_or(vec![])
        } else {
            block_on(
                sqlx::query_as::<_, StorageEntry>(
                    "SELECT id, name, extension, entry_type::TEXT FROM storage_entries WHERE parent_folder = $1",
                )
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
                    "SELECT parent_folder FROM storage_entries WHERE id = $1",
                )
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
}

pub fn vfs_main(db_pool: RequestPool, uid: u32, gid: u32) -> BackgroundSession {
    let mountpoint = env::var("MOUNTPOINT").unwrap_or("/mnt/test".to_string());
    let options = vec![
        MountOption::RO,
        MountOption::NoAtime,
        MountOption::NoExec,
        // MountOption::AutoUnmount,
        MountOption::FSName("y".to_string()),
    ];
    // options.push(MountOption::AllowRoot);
    fuser::spawn_mount2(HelloFS { db_pool, uid, gid }, mountpoint, &options).unwrap()
}
