use fuser::{
    BackgroundSession, FileAttr, FileType, Filesystem, MountOption, ReplyAttr, ReplyData,
    ReplyDirectory, ReplyEntry, Request,
};
use futures::executor::block_on;
use libc::{EEXIST, ENOENT, ENOSYS, RENAME_NOREPLACE};
use log::*;
use rand::Rng;
use rustix::path::Arg;
use std::collections::HashMap;
use std::ffi::OsStr;
use std::fs::{self, File, OpenOptions};
use std::path::Path;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::storage_endpoint::get_storage_endpoint;
use crate::util::RequestPool;
use crate::vfs_util::{
    vfs_create_entry, vfs_delete_entry_from_db, vfs_file_get_attr, vfs_file_read,
    vfs_file_set_times, vfs_file_write, vfs_find_entry, vfs_get_entry,
};

const TTL: Duration = Duration::from_secs(60 * 60); // 1 hour
pub const PERM: u16 = 0o666;
pub const BLOCKSIZE: u32 = 512;

struct YFS {
    db_pool: RequestPool,

    endpoint_id: i32,
    endpoint_base_path: String,

    // TODO Research a better way of storing file handles. Vec?
    file_handles: HashMap<u64, File>,

    uid: u32,
    gid: u32,
}

// TODO! most input parameters are currently ignored!
// TODO fix branch misses
// and not all cases are handled. It's not robust at all, edge cases will just break the fs.
impl Filesystem for YFS {
    fn mknod(
        &mut self,
        _req: &Request<'_>,
        parent: u64,
        name: &OsStr,
        _mode: u32,
        _umask: u32,
        _rdev: u32,
        reply: ReplyEntry,
    ) {
        let parent_folder_ino = parent as i64 - 1;

        if let Ok(name) = name.as_str() {
            let attr = vfs_create_entry(
                self.endpoint_id,
                self.endpoint_base_path.as_str(),
                name,
                parent_folder_ino,
                &mut self.db_pool,
            );

            if let Ok(attr) = attr {
                reply.entry(&TTL, &attr, 0);
            } else {
                reply.error(ENOENT);
            }
        } else {
            reply.error(ENOSYS);
        }
    }

    fn unlink(&mut self, _req: &Request<'_>, parent: u64, name: &OsStr, reply: fuser::ReplyEmpty) {
        if let Ok(name) = name.as_str() {
            let adjusted_parent_ino = parent as i64 - 1;

            // Delete from the database
            let db_delete_result = vfs_delete_entry_from_db(
                self.endpoint_id,
                adjusted_parent_ino,
                name,
                &mut self.db_pool,
            );

            if let Ok(deleted_entry) = db_delete_result {
                // Delete from the filesystem
                if deleted_entry.filesystem_id.is_none() {
                    return reply.ok();
                }

                let file_path = Path::new(self.endpoint_base_path.as_str())
                    .join(&deleted_entry.filesystem_id.unwrap());

                let fs_delete_result = fs::remove_file(&file_path);

                if fs_delete_result.is_ok() {
                    reply.ok();
                } else {
                    // TODO not really a correct error code for this case
                    reply.error(ENOSYS);
                }
            } else {
                reply.error(ENOENT);
            }
        } else {
            reply.error(ENOENT);
        }
    }

    fn rmdir(&mut self, _req: &Request<'_>, parent: u64, name: &OsStr, reply: fuser::ReplyEmpty) {
        if let Ok(name) = name.as_str() {
            let adjusted_parent_ino = parent as i64 - 1;

            let delete_result = vfs_delete_entry_from_db(
                self.endpoint_id,
                adjusted_parent_ino,
                name,
                &mut self.db_pool,
            );

            if delete_result.is_ok() {
                reply.ok();
            } else {
                reply.error(ENOENT);
            }
        } else {
            reply.error(ENOSYS);
        }
    }

    fn open(&mut self, _req: &Request<'_>, ino: u64, _flags: i32, reply: fuser::ReplyOpen) {
        let adjusted_ino = ino as i64 - 1;

        let entry = vfs_get_entry(self.endpoint_id, adjusted_ino, &mut self.db_pool);

        if let Ok(entry) = entry {
            if entry.filesystem_id.is_none() {
                // This is a folder, not a file
                return reply.error(ENOENT);
            }

            let file_path =
                Path::new(self.endpoint_base_path.as_str()).join(&entry.filesystem_id.unwrap());
            let file = OpenOptions::new()
                .read(true)
                .write(true)
                .create(false)
                .truncate(false)
                .open(&file_path);

            if let Ok(file) = file {
                let fh = rand::thread_rng().gen::<u64>();

                self.file_handles.insert(fh, file);

                reply.opened(fh, 0);
            } else {
                return reply.error(ENOENT);
            }
        } else {
            reply.error(ENOENT);
        }
    }

    fn release(
        &mut self,
        _req: &Request<'_>,
        _ino: u64,
        fh: u64,
        _flags: i32,
        _lock_owner: Option<u64>,
        _flush: bool,
        reply: fuser::ReplyEmpty,
    ) {
        if fh == 0 {
            return reply.error(ENOENT);
        }

        let file = self.file_handles.remove(&fh);

        // TODO not sure we need to sync here. OS *should* call flush before release
        if let Some(file) = file {
            let _ = file.sync_all();
        }

        reply.ok();
    }

    fn flush(
        &mut self,
        _req: &Request<'_>,
        _ino: u64,
        fh: u64,
        _lock_owner: u64,
        reply: fuser::ReplyEmpty,
    ) {
        if fh == 0 {
            return reply.error(ENOENT);
        }

        let file = self.file_handles.get_mut(&fh);

        if let Some(file) = file {
            let _ = file.sync_all();
        }

        reply.ok();
    }

    fn read(
        &mut self,
        _req: &Request,
        ino: u64,
        fh: u64,
        offset: i64,
        size: u32,
        _flags: i32,
        _lock: Option<u64>,
        reply: ReplyData,
    ) {
        if fh != 0 {
            let file = self.file_handles.get_mut(&fh);

            if let Some(file) = file {
                vfs_file_read(reply, file, offset, size);
            } else {
                return reply.error(ENOENT);
            }
        } else {
            let adjusted_ino = ino as i64 - 1;

            let entry = vfs_get_entry(self.endpoint_id, adjusted_ino, &mut self.db_pool);

            if let Ok(entry) = entry {
                if let Some(filesystem_id) = entry.filesystem_id {
                    let file_path =
                        Path::new(self.endpoint_base_path.as_str()).join(&filesystem_id);
                    let mut file = File::open(&file_path).unwrap();

                    vfs_file_read(reply, &mut file, offset, size);
                } else {
                    // This is a folder, can't read it
                    return reply.error(ENOENT);
                }
            } else {
                reply.error(ENOENT);
            }
        }
    }

    fn write(
        &mut self,
        _req: &Request<'_>,
        ino: u64,
        fh: u64,
        offset: i64,
        data: &[u8],
        _write_flags: u32,
        _flags: i32,
        _lock_owner: Option<u64>,
        reply: fuser::ReplyWrite,
    ) {
        let adjusted_ino = ino as i64 - 1;

        if fh != 0 {
            let file = self.file_handles.get_mut(&fh);

            if let Some(mut file) = file {
                vfs_file_write(
                    reply,
                    self.endpoint_id,
                    adjusted_ino,
                    &mut file,
                    offset,
                    data,
                    &mut self.db_pool,
                );
            } else {
                return reply.error(ENOENT);
            }
        } else {
            let entry = vfs_get_entry(self.endpoint_id, adjusted_ino, &mut self.db_pool);

            if let Ok(entry) = entry {
                if entry.filesystem_id.is_none() {
                    // This is a folder, can't write to it
                    return reply.error(ENOENT);
                }

                let file_path =
                    Path::new(self.endpoint_base_path.as_str()).join(&entry.filesystem_id.unwrap());
                let mut file = OpenOptions::new()
                    .write(true)
                    .create(false)
                    .truncate(false)
                    .open(&file_path)
                    .unwrap();

                vfs_file_write(
                    reply,
                    self.endpoint_id,
                    adjusted_ino,
                    &mut file,
                    offset,
                    data,
                    &mut self.db_pool,
                );
            } else {
                reply.error(ENOENT);
            }
        }
    }

    fn access(&mut self, _req: &Request<'_>, _ino: u64, _mask: i32, reply: fuser::ReplyEmpty) {
        // TODO access to everything
        reply.ok()
    }

    fn getattr(&mut self, _req: &Request, ino: u64, fh: Option<u64>, reply: ReplyAttr) {
        let adjusted_ino = ino as i64 - 1;

        if adjusted_ino == 0 {
            // Root "folder"
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
                    blksize: BLOCKSIZE,
                },
            )
        } else {
            // Some entry

            if let Some(fh) = fh {
                let file = self.file_handles.get_mut(&fh);

                if let Some(file) = file {
                    let attr = vfs_file_get_attr(file, ino);

                    reply.attr(&TTL, &attr);
                } else {
                    reply.error(ENOENT);
                }
            } else {
                let entry = vfs_get_entry(self.endpoint_id, adjusted_ino, &mut self.db_pool);

                if let Ok(entry) = entry {
                    if let Some(filesystem_id) = entry.filesystem_id {
                        // A file

                        let file_path =
                            Path::new(self.endpoint_base_path.as_str()).join(&filesystem_id);
                        let mut file = File::open(&file_path).unwrap();

                        let attr = vfs_file_get_attr(&mut file, ino);

                        reply.attr(&TTL, &attr);
                    } else {
                        // A folder

                        reply.attr(
                            &TTL,
                            &FileAttr {
                                ino: entry.id as u64 + 1,
                                size: 0,
                                blocks: 0,
                                // TODO extract actual times from the database. `created_at` col should work
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
                                blksize: BLOCKSIZE,
                            },
                        );
                    }
                } else {
                    reply.error(ENOENT);
                }
            }
        }
    }

    fn setattr(
        &mut self,
        _req: &Request<'_>,
        ino: u64,
        _mode: Option<u32>,
        uid: Option<u32>,
        gid: Option<u32>,
        size: Option<u64>,
        atime: Option<fuser::TimeOrNow>,
        mtime: Option<fuser::TimeOrNow>,
        _ctime: Option<std::time::SystemTime>,
        fh: Option<u64>,
        _crtime: Option<std::time::SystemTime>,
        _chgtime: Option<std::time::SystemTime>,
        _bkuptime: Option<std::time::SystemTime>,
        flags: Option<u32>,
        reply: ReplyAttr,
    ) {
        let adjusted_ino = ino as i64 - 1;

        if let Some(fh) = fh {
            let file = self.file_handles.get_mut(&fh);

            if let Some(file) = file {
                let mut attr = vfs_file_get_attr(file, ino);

                attr.size = size.unwrap_or(attr.size);
                attr.blocks = (attr.size + BLOCKSIZE as u64 - 1) / BLOCKSIZE as u64;

                attr.uid = uid.unwrap_or(attr.uid);
                attr.gid = gid.unwrap_or(attr.gid);

                attr.flags = flags.unwrap_or(attr.flags);

                vfs_file_set_times(file, atime, mtime, &mut attr);

                reply.attr(&TTL, &attr);
            } else {
                return reply.error(ENOENT);
            }
        } else {
            let entry = vfs_get_entry(self.endpoint_id, adjusted_ino, &mut self.db_pool);

            if let Ok(entry) = entry {
                if let Some(filesystem_id) = entry.filesystem_id {
                    let file_path =
                        Path::new(self.endpoint_base_path.as_str()).join(&filesystem_id);
                    let mut file = File::open(&file_path).unwrap();

                    let mut attr = vfs_file_get_attr(&mut file, ino);

                    attr.size = size.unwrap_or(attr.size);
                    attr.blocks = (attr.size + BLOCKSIZE as u64 - 1) / BLOCKSIZE as u64;

                    attr.uid = uid.unwrap_or(attr.uid);
                    attr.gid = gid.unwrap_or(attr.gid);

                    attr.flags = flags.unwrap_or(attr.flags);

                    vfs_file_set_times(&mut file, atime, mtime, &mut attr);

                    reply.attr(&TTL, &attr);
                } else {
                    // TODO! Not implemented. This is a folder, error out for now
                    reply.error(ENOENT);
                }
            } else {
                reply.error(ENOENT);
            }
        }
    }

    fn lookup(&mut self, _req: &Request, parent: u64, name: &OsStr, reply: ReplyEntry) {
        let adjusted_parent_ino = parent as i64 - 1;

        let entry = vfs_find_entry(
            self.endpoint_id,
            adjusted_parent_ino,
            name.to_string_lossy().as_ref(),
            &mut self.db_pool,
        );

        if let Ok(entry) = entry {
            if let Some(filesystem_id) = entry.filesystem_id {
                // A file

                let file_path = Path::new(self.endpoint_base_path.as_str()).join(&filesystem_id);
                let mut file = File::open(&file_path).unwrap();

                let attr = vfs_file_get_attr(&mut file, entry.id as u64 + 1);

                reply.entry(&TTL, &attr, 0);
            } else {
                // TODO! Not implemented. This is a folder, send random attributes for now

                reply.entry(
                    &TTL,
                    &FileAttr {
                        ino: entry.id as u64 + 1,
                        size: 0,
                        blocks: 0,
                        // TODO extract actual times from the database. `created_at` col should work
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
                        blksize: BLOCKSIZE,
                    },
                    0,
                );
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
            entry_type: String,
        }

        let adjusted_ino = ino as i64 - 1;

        let entries_result = block_on(
            sqlx::query_as::<_, StorageEntry>(
                format!(
                    "SELECT id, name, entry_type::TEXT FROM storage_entries WHERE endpoint_id = $1 AND parent_folder {}",
                    if adjusted_ino == 0 { "IS NULL" } else { "= $2" }
                ).as_str()
            )
            .bind(self.endpoint_id)
            .bind(adjusted_ino)
            .fetch_all(&self.db_pool),
        )
        .unwrap_or(vec![]);

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

            (
                entry.id as u64 + 1,
                if is_file {
                    FileType::RegularFile
                } else {
                    FileType::Directory
                },
                entry.name,
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

        let mkdir_result = block_on(
            sqlx::query_scalar::<_, i64>(
                format!(
                    "INSERT INTO storage_entries (endpoint_id, parent_folder, name, entry_type) VALUES ($1, {}, $3, 'folder'::storage_entry_type) RETURNING id",
                    if adjusted_parent_ino == 0 { "NULL" } else { "$2" }
                ).as_str()
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
                    atime: SystemTime::now(),
                    mtime: SystemTime::now(),
                    ctime: SystemTime::now(),
                    crtime: SystemTime::now(),
                    kind: FileType::Directory,
                    perm: PERM,
                    nlink: 1,
                    uid: self.uid,
                    gid: self.gid,
                    rdev: 0,
                    flags: 0,
                    blksize: BLOCKSIZE,
                },
                0,
            );
        } else {
            reply.error(ENOENT);
        }
    }

    // TODO This is frequently used by programs that mutate files, like text or image editors.
    // They write everything they need to a new temporary file, and then rename it to the original,
    // effectively replacing the current file with a new one.
    // This is common, so the implementation should be quick and efficient.
    // This is not the case at the moment - we are first trying to rename the file, and if that fails,
    // we delete the conflicting file and try the rename again. This is not efficient at all, it's
    // like three steps...
    fn rename(
        &mut self,
        _req: &Request<'_>,
        parent: u64,
        name: &OsStr,
        newparent: u64,
        newname: &OsStr,
        flags: u32,
        reply: fuser::ReplyEmpty,
    ) {
        let dont_replace = flags & RENAME_NOREPLACE == RENAME_NOREPLACE;

        let adjusted_parent_ino = parent as i64 - 1;
        let adjusted_newparent_ino = newparent as i64 - 1;

        let rename_sql = format!(
            "UPDATE storage_entries SET parent_folder = $1, name = $2 WHERE endpoint_id = $3 AND parent_folder {} AND name = $5 RETURNING id",
            if adjusted_parent_ino > 0 { "= $4" } else { "IS NULL" },
        );

        let rename_query = sqlx::query_scalar::<_, Option<i64>>(rename_sql.as_str())
            .bind(adjusted_newparent_ino)
            .bind(newname.to_string_lossy())
            .bind(self.endpoint_id)
            .bind(adjusted_parent_ino)
            .bind(name.to_string_lossy());

        let rename_result = block_on(rename_query.fetch_one(&self.db_pool));

        match rename_result {
            Ok(_) => {
                // Rename successful
                reply.ok();
            }
            Err(_) => {
                // Rename failed, most probably because of a conflict

                if dont_replace {
                    // Do not replace
                    reply.error(EEXIST);
                } else {
                    // Replace dst with src
                    let newname = newname.to_string_lossy();

                    // Delete conflicting entry from the database
                    let db_delete_conflicting_result = vfs_delete_entry_from_db(
                        self.endpoint_id,
                        adjusted_parent_ino,
                        newname.as_ref(),
                        &mut self.db_pool,
                    );

                    if let Ok(conflicting_entry) = db_delete_conflicting_result {
                        // Delete from the filesystem
                        if conflicting_entry.filesystem_id.is_some() {
                            let conflicting_file_path = Path::new(self.endpoint_base_path.as_str())
                                .join(&conflicting_entry.filesystem_id.unwrap());

                            let fs_delete_result = fs::remove_file(&conflicting_file_path);

                            if fs_delete_result.is_err() {
                                error!(
                                    "[VFS] Could not delete a rename conflicting file from the filesystem: {:?}",
                                    fs_delete_result
                                );
                            }
                        }

                        // TODO! duplicated code
                        let retry_rename_query =
                            sqlx::query_scalar::<_, Option<i64>>(rename_sql.as_str())
                                .bind(adjusted_newparent_ino)
                                .bind(newname.to_string_lossy())
                                .bind(self.endpoint_id)
                                .bind(adjusted_parent_ino)
                                .bind(name.to_string_lossy());

                        let retry_rename_result =
                            block_on(retry_rename_query.fetch_one(&self.db_pool));

                        match retry_rename_result {
                            Ok(_) => {
                                reply.ok();
                            }
                            Err(_) => {
                                reply.error(ENOENT);
                            }
                        }
                    } else {
                        reply.error(ENOENT);
                    }
                }
            }
        }
    }
}

pub fn vfs_mount(
    endpoint_id: i32,
    mountpoint: &str,

    options: Vec<MountOption>,

    db_pool: RequestPool,
    executor: (u32, u32),
) -> BackgroundSession {
    let file_handles = HashMap::new();
    let (uid, gid) = executor;

    let endpoint = block_on(get_storage_endpoint(endpoint_id, &db_pool)).unwrap();

    fuser::spawn_mount2(
        YFS {
            db_pool,

            endpoint_id,
            endpoint_base_path: endpoint.base_path,

            file_handles,

            uid,
            gid,
        },
        mountpoint,
        &options,
    )
    .unwrap()
}
