use crate::{storage_archives::cleanup_storage_archives, util::RequestPool};
use std::str::FromStr;

use chrono::{FixedOffset, Local};

pub fn setup_job_scheduler(pool: RequestPool) {
    actix_rt::spawn(async move {
        // At 0 minutes past the hour, every 12 hours
        let schedule = cron::Schedule::from_str("0 0 0/12 * * * *").unwrap();
        let offset = FixedOffset::east_opt(0).unwrap();

        loop {
            let mut upcoming = schedule.upcoming(offset).take(1);
            actix_rt::time::sleep(std::time::Duration::from_secs(30)).await;

            let local = &Local::now();

            if let Some(datetime) = upcoming.next() {
                if datetime.timestamp() <= local.timestamp() {
                    cleanup_storage_archives(&pool).await;
                }
            }
        }
    });
}
