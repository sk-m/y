use fuser::{
    BackgroundSession, FileAttr, FileType, Filesystem, MountOption, ReplyAttr, ReplyData,
    ReplyDirectory, ReplyEntry, Request,
};
use futures::executor::block_on;
use libc::ENOENT;
use log::info;
use std::env;
use std::ffi::OsStr;
use std::time::{Duration, UNIX_EPOCH};

use crate::util::RequestPool;

const TTL: Duration = Duration::from_secs(600); // 1 second

const HELLO_DIR_ATTR: FileAttr = FileAttr {
    ino: 1,
    size: 0,
    blocks: 0,
    atime: UNIX_EPOCH, // 1970-01-01 00:00:00
    mtime: UNIX_EPOCH,
    ctime: UNIX_EPOCH,
    crtime: UNIX_EPOCH,
    kind: FileType::Directory,
    perm: 0o755,
    nlink: 2,
    uid: 501,
    gid: 20,
    rdev: 0,
    flags: 0,
    blksize: 512,
};

const HELLO_TXT_CONTENT: &str = "Hello World!\n";

const HELLO_TXT_ATTR: FileAttr = FileAttr {
    ino: 2,
    size: 13,
    blocks: 1,
    atime: UNIX_EPOCH, // 1970-01-01 00:00:00
    mtime: UNIX_EPOCH,
    ctime: UNIX_EPOCH,
    crtime: UNIX_EPOCH,
    kind: FileType::RegularFile,
    perm: 0o777,
    nlink: 1,
    uid: 501,
    gid: 20,
    rdev: 0,
    flags: 0,
    blksize: 512,
};

struct HelloFS {
    db_pool: RequestPool,
}

impl Filesystem for HelloFS {
    fn lookup(&mut self, _req: &Request, parent: u64, name: &OsStr, reply: ReplyEntry) {
        if parent == 1 && name.to_str() == Some("hello.txt") {
            reply.entry(&TTL, &HELLO_TXT_ATTR, 0);
        } else {
            reply.entry(&TTL, &HELLO_TXT_ATTR, 0);
            // reply.error(ENOENT);
        }
    }

    fn getattr(&mut self, _req: &Request, ino: u64, _fh: Option<u64>, reply: ReplyAttr) {
        match ino {
            1 => reply.attr(&TTL, &HELLO_DIR_ATTR),
            2 => reply.attr(&TTL, &HELLO_TXT_ATTR),
            _ => reply.error(ENOENT),
        }
    }

    fn read(
        &mut self,
        _req: &Request,
        ino: u64,
        _fh: u64,
        offset: i64,
        _size: u32,
        _flags: i32,
        _lock: Option<u64>,
        reply: ReplyData,
    ) {
        if ino == 2 {
            reply.data(&HELLO_TXT_CONTENT.as_bytes()[offset as usize..]);
        } else {
            reply.data(&HELLO_TXT_CONTENT.as_bytes()[offset as usize..]);

            // reply.error(ENOENT);
        }
    }

    fn readdir<'a>(
        &mut self,
        _req: &Request,
        ino: u64,
        _fh: u64,
        offset: i64,
        mut reply: ReplyDirectory,
    ) {
        if ino != 1 {
            reply.error(ENOENT);
            return;
        }

        #[derive(sqlx::FromRow, Debug)]
        struct Entry {
            id: i64,
            name: String,
            extension: Option<String>,
        }

        let db_entries: Vec<Entry> = block_on(
            sqlx::query_as::<_, Entry>("SELECT id, name, extension FROM storage_entries")
                .fetch_all(&self.db_pool),
        )
        .unwrap_or(vec![]);

        dbg!(&db_entries);

        let mut entries = vec![
            (1, FileType::Directory, ".".to_string()),
            (1, FileType::Directory, "..".to_string()),
        ];

        for entry in db_entries {
            let name = format!(
                "{}.{}",
                entry.name,
                entry.extension.unwrap_or("".to_string())
            );

            entries.push((entry.id as u64, FileType::RegularFile, name));
        }

        for (i, entry) in entries.into_iter().enumerate().skip(offset as usize) {
            // i + 1 means the index of the next entry
            if reply.add(entry.0, (i + 1) as i64, entry.1, entry.2) {
                break;
            }
        }
        reply.ok();
    }
}

pub fn vfs_main(db_pool: RequestPool) -> BackgroundSession {
    let mountpoint = env::var("MOUNTPOINT").unwrap_or("/mnt/test".to_string());
    let options = vec![
        MountOption::RW,
        // MountOption::AutoUnmount,
        MountOption::FSName("hello".to_string()),
    ];
    // options.push(MountOption::AllowRoot);
    fuser::spawn_mount2(HelloFS { db_pool }, mountpoint, &options).unwrap()
}
