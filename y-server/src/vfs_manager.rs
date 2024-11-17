use std::collections::HashMap;

use fuser::{BackgroundSession, MountOption};
use log::*;
use sqlx::FromRow;
use users::{get_current_gid, get_current_uid};

use crate::{util::RequestPool, vfs::vfs_mount};

pub struct VFSState {
    pub handles: HashMap<i32, BackgroundSession>,
}

pub async fn mount_vfs_endpoints(state: &mut VFSState, pool: &mut RequestPool) {
    #[derive(FromRow)]
    struct EndpointConfig {
        endpoint_id: i32,
        writable: bool,
        mountpoint: String,
    }

    let endpoints = sqlx::query_as::<_, EndpointConfig>(
        "SELECT endpoint_id, writable, mountpoint FROM storage_vfs WHERE enabled IS TRUE",
    )
    .fetch_all(&*pool)
    .await;

    if let Ok(endpoints) = endpoints {
        for endpoint in endpoints {
            info!(
                "Mounting endpoint {} at {}...",
                endpoint.endpoint_id, endpoint.mountpoint
            );

            let options = vec![
                MountOption::FSName(format!("ye{}", endpoint.endpoint_id)),
                if endpoint.writable {
                    MountOption::RW
                } else {
                    MountOption::RO
                },
                MountOption::NoAtime,
                MountOption::NoExec,
                MountOption::NoDev,
            ];

            let handle = vfs_mount(
                endpoint.endpoint_id,
                &endpoint.mountpoint,
                options,
                pool.clone(),
                (get_current_uid(), get_current_gid()),
            );

            state.handles.insert(endpoint.endpoint_id, handle);
        }
    }
}
