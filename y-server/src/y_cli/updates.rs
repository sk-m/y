use std::{fs, path::Path, process::Command};

use reqwest::header::USER_AGENT;

pub struct VersionInfo {
    pub tag_name: String,
    pub release_date: String,
    pub version: semver::Version,
}

pub async fn fetch_latest_version() -> Result<VersionInfo, reqwest::Error> {
    let client = reqwest::Client::new();

    let releases = client
        .get("https://api.github.com/repos/sk-m/y/releases")
        .header(USER_AGENT, "y-cli")
        .send()
        .await?
        .json::<serde_json::Value>()
        .await?;

    let latest = &releases[0];
    let latest_tag_name = latest["tag_name"]
        .as_str()
        .expect("failed to parse releases from GitHub");

    let latest_release_date = latest["published_at"]
        .as_str()
        .expect("failed to parse releases from GitHub");

    // Tags for versions start with a "v" character
    let mut latest_version = latest_tag_name.to_string();
    latest_version.remove(0);

    Ok(VersionInfo {
        tag_name: latest_tag_name.to_string(),
        release_date: latest_release_date.to_string(),
        version: semver::Version::parse(&latest_version).expect("failed to parse version"),
    })
}

pub async fn download_dist(work_path: &str, tag: &str) -> Option<Box<Path>> {
    let client = reqwest::Client::new();

    let release_info = client
        .get(format!(
            "https://api.github.com/repos/sk-m/y/releases/tags/{}",
            tag
        ))
        .header(USER_AGENT, "y-cli")
        .send()
        .await
        .expect("failed to fetch release info")
        .json::<serde_json::Value>()
        .await
        .expect("failed to fetch release info");

    let assets = release_info["assets"]
        .as_array()
        .expect("failed to parse assets");

    // Tags for versions start with a "v" character
    let mut version_str = tag.to_string();
    version_str.remove(0);

    let updates_path = Path::new(work_path).join("updates");
    let dist_filename = format!("y-{}.zip", version_str);

    for asset in assets {
        let asset_name = asset["name"].as_str().unwrap();

        if asset_name == dist_filename {
            let download_url = asset["browser_download_url"].as_str().unwrap();
            let dist_file_path = updates_path.join(&dist_filename);

            let mut dist_file =
                fs::File::create(&dist_file_path).expect("failed to create a dist file");

            let dist_response = client
                .get(download_url)
                .header(USER_AGENT, "y-cli")
                .send()
                .await
                .expect("failed to fetch dist file");

            let mut content = std::io::Cursor::new(dist_response.bytes().await.unwrap());
            std::io::copy(&mut content, &mut dist_file).expect("Failed to write to the filesystem");

            return Some(dist_file_path.into_boxed_path());
        }
    }

    None
}

pub fn unzip_dist(zip_path: &Path, target: &Path) {
    Command::new("unzip")
        .arg("-o")
        .arg(zip_path)
        .arg("-d")
        .arg(target)
        .output()
        .expect("failed to unzip dist file");
}
