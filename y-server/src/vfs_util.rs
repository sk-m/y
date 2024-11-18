use fuser::{FileAttr, FileType, ReplyData, ReplyWrite};
use futures::executor::block_on;
use libc::ENOENT;
use log::*;
use std::os::unix::fs::MetadataExt;
use std::{
    fs::{File, FileTimes},
    io::{Read, Seek, SeekFrom, Write},
    path::Path,
    time::SystemTime,
};
use uuid::Uuid;

use crate::vfs::{BLOCKSIZE, PERM};
use crate::{storage_entry::StorageError, util::RequestPool};

#[derive(sqlx::FromRow, Debug)]
pub struct VFSStorageEntry {
    pub id: i64,
    pub filesystem_id: Option<String>,
}

/// Get entry from the database by it's id
pub fn vfs_get_entry(
    endpoint_id: i32,
    ino: i64,
    pool: &mut RequestPool,
) -> Result<VFSStorageEntry, sqlx::Error> {
    block_on(
        sqlx::query_as::<_, VFSStorageEntry>(
            "SELECT id, filesystem_id FROM storage_entries WHERE endpoint_id = $1 AND id = $2",
        )
        .bind(endpoint_id)
        .bind(ino)
        .fetch_one(&*pool),
    )
}

/// Get entry from the database by its name and parent folder (effectively search for it in a folder)
pub fn vfs_find_entry(
    endpoint_id: i32,
    parent_folder: i64,
    name: &str,
    pool: &mut RequestPool,
) -> Result<VFSStorageEntry, sqlx::Error> {
    let name_separator = name.rfind('.').unwrap_or(name.len());

    let (target_name, mut target_extension) = name.split_at(name_separator);

    if target_extension.len() > 0 {
        target_extension = target_extension.trim_start_matches('.');
    }

    block_on(
        sqlx::query_as::<_, VFSStorageEntry>(
            format!(
                "SELECT id, filesystem_id FROM storage_entries WHERE endpoint_id = $1 AND parent_folder {} AND name = $3 AND extension {}",
                if parent_folder > 0 { "= $2" } else { "IS NULL" },
                if target_extension.len() > 0 {
                    "= $4"
                } else {
                    "IS NULL"
                }
            ).as_str()
        )
        .bind(endpoint_id)
        .bind(parent_folder)
        .bind(target_name)
        .bind(target_extension)
        .fetch_one(&*pool)
    )
}

/// Create a new storage entry. Add it to the database and create a new file on the disk
pub fn vfs_create_entry(
    endpoint_id: i32,
    endpoint_base_path: &str,
    name: &str,
    parent_folder: i64,
    pool: &mut RequestPool,
) -> Result<FileAttr, StorageError> {
    let name_separator = name.rfind('.').unwrap_or(name.len());

    let (target_name, mut target_extension) = name.split_at(name_separator);

    if target_extension.len() > 0 {
        target_extension = target_extension.trim_start_matches('.');
    }

    let filesystem_id = Uuid::new_v4().to_string();

    let file_path = Path::new(endpoint_base_path).join(&filesystem_id);
    let file = File::create(&file_path);

    if let Ok(mut file) = file {
        let entry_result = block_on(sqlx::query_scalar::<_, i64>(
            format!(
            "INSERT INTO storage_entries (endpoint_id, name, extension, parent_folder, entry_type, filesystem_id, created_at) VALUES ($1, $2, {}, {}, 'file'::storage_entry_type, $5, now()) RETURNING id",
                if target_extension.len() > 0 {
                    "$3"
                } else {
                    "NULL"
                },
                if parent_folder > 0 {
                    "$4"
                } else {
                    "NULL"
                }
            ).as_str(),
        )
        .bind(endpoint_id)
        .bind(target_name)
        .bind(target_extension)
        .bind(parent_folder)
        .bind(filesystem_id)
        .fetch_one(&*pool));

        match entry_result {
            Ok(entry_id) => {
                let attr = vfs_file_get_attr(&mut file, entry_id as u64 + 1);

                Ok(attr)
            }
            Err(err) => {
                error!("[VFS] Failed To add a new entry to the database: {err}");
                Err(StorageError::Internal)
            }
        }
    } else {
        return Err(StorageError::Internal);
    }
}

/// Set accessed and modified times for a file.
///
/// The times are set for the file on the disk, the database is not updated.
pub fn vfs_file_set_times(
    file: &mut File,
    atime: Option<fuser::TimeOrNow>,
    mtime: Option<fuser::TimeOrNow>,
    attr: &mut FileAttr,
) {
    let times = FileTimes::new();

    if let Some(atime) = atime {
        match atime {
            fuser::TimeOrNow::SpecificTime(time) => {
                times.set_accessed(time);
                attr.atime = time;
            }
            fuser::TimeOrNow::Now => {
                let now = SystemTime::now();

                times.set_accessed(now);
                attr.atime = now;
            }
        }
    }

    if let Some(mtime) = mtime {
        match mtime {
            fuser::TimeOrNow::SpecificTime(time) => {
                times.set_modified(time);
                attr.mtime = time;
                attr.ctime = time;
            }
            fuser::TimeOrNow::Now => {
                let now = SystemTime::now();

                times.set_modified(now);
                attr.mtime = now;
                attr.ctime = now;
            }
        }
    }

    file.set_times(times).unwrap();
}

/// Get file's attributes
pub fn vfs_file_get_attr(file: &mut File, ino: u64) -> FileAttr {
    let metadata = file.metadata().unwrap();
    let atime = metadata.accessed().unwrap();
    let mtime = metadata.modified().unwrap();
    let crtime = metadata.created().unwrap();

    let uid = metadata.uid();
    let gid = metadata.gid();

    let size_bytes = metadata.len();
    let size_blocks = (size_bytes + BLOCKSIZE as u64 - 1) / BLOCKSIZE as u64;

    FileAttr {
        ino,
        size: size_bytes,
        blocks: size_blocks,
        atime,
        mtime,
        ctime: mtime,
        crtime: crtime,
        kind: FileType::RegularFile,
        perm: PERM, // TODO extract actual perms from the file?
        nlink: 1,
        uid,
        gid,
        rdev: 0,
        flags: 0,
        blksize: BLOCKSIZE,
    }
}

/// Delete entry from the database (file on disk is not removed)
pub fn vfs_delete_entry_from_db(
    endpoint_id: i32,
    parent_folder: i64,
    name: &str,
    pool: &mut RequestPool,
) -> Result<VFSStorageEntry, StorageError> {
    let name_separator = name.rfind('.').unwrap_or(name.len());

    let (target_name, mut target_extension) = name.split_at(name_separator);

    if target_extension.len() > 0 {
        target_extension = target_extension.trim_start_matches('.');
    }

    let delete_result = block_on(
        sqlx::query_as::<_, VFSStorageEntry>(
            format!("DELETE FROM storage_entries WHERE endpoint_id = $1 AND name = $2 AND extension {} AND parent_folder {} RETURNING id, filesystem_id",
                if target_extension.len() > 0 { "= $3" } else { "IS NULL" },
                if parent_folder > 0 { "= $4" } else { "IS NULL" }
            ).as_str(),
        )
            .bind(endpoint_id)
            .bind(target_name)
            .bind(target_extension)
            .bind(parent_folder)
            .fetch_one(&*pool),
    );

    match delete_result {
        Ok(deleted_entry) => Ok(deleted_entry),
        Err(err) => {
            error!("[VFS] Failed to delete an entry from the database: {err}");
            Err(StorageError::Internal)
        }
    }
}

/// Read bytes from a file and reply
pub fn vfs_file_read(reply: ReplyData, file: &mut File, offset: i64, size: u32) {
    let file_size = file.metadata().unwrap().len();

    let seek_result = file.seek(SeekFrom::Start(offset as u64));

    if seek_result.is_err() {
        return reply.error(ENOENT);
    }

    let buffer_size = if size as u64 > file_size - offset as u64 {
        (file_size - offset as u64) as usize
    } else {
        size as usize
    };

    let mut buffer = vec![0; buffer_size];
    let read_result = file.read_exact(&mut buffer);

    if read_result.is_ok() {
        reply.data(&buffer);
    } else {
        reply.error(ENOENT);
    }
}

/// Write bytes to a file
pub fn vfs_file_write(
    reply: ReplyWrite,
    endpoint_id: i32,
    ino: i64,
    file: &mut File,
    offset: i64,
    data: &[u8],
    pool: &mut RequestPool,
) {
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
            .bind(endpoint_id)
            .bind(ino)
            .execute(&*pool),
        );
    } else {
        reply.error(ENOENT);
    }
}
