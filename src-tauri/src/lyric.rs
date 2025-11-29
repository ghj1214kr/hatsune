use std::fs::File;
use std::io::{Read, Seek};

use anyhow::Result;
use chrono::{Datelike, Timelike, Utc};
use once_cell::sync::Lazy;
use rsa::pkcs8::DecodePublicKey;
use rsa::rand_core::OsRng;
use rsa::{Pkcs1v15Encrypt, RsaPublicKey};

const PEM_PUBLIC_KEY: &str = "-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDfvB8/TBDhfgES1y54kW2lBu3V
faBurGrk8A3TAQZxeAV7qpupTvbmZb+ynO5WfeQIEknAvjdvmBE4PObRK610Si8S
/BYYnD1uwEEiK0WVQYQWXzfZjRiO1a0Vj/i1AE6OcX9xT8liq36wLVhIGWDU1i8J
wLZC5JbscD7KHGU3SwIDAQAB
-----END PUBLIC KEY-----";
const RSA_PUBLIC_KEY: Lazy<RsaPublicKey> =
    Lazy::new(|| RsaPublicKey::from_public_key_pem(PEM_PUBLIC_KEY).unwrap());

fn get_id3_tag_size(file: &mut File) -> Result<usize> {
    let mut buffer = [0; 10];

    file.read_exact(&mut buffer)?;

    if &buffer[0..3] != b"ID3" {
        return Err(anyhow::anyhow!("ID3 tag not found"));
    }

    let size = ((buffer[6] as usize) << 21)
        | ((buffer[7] as usize) << 14)
        | ((buffer[8] as usize) << 7)
        | (buffer[9] as usize);

    return Ok(size + 10);
}

fn get_md5_hash(path: &str) -> Result<String> {
    let mut file: File = File::open(path)?;

    let id3_tag_size: usize = get_id3_tag_size(&mut file)?;

    let start_position: u64 = id3_tag_size as u64;
    file.seek(std::io::SeekFrom::Start(start_position))?;

    let mut buffer: [u8; 163840] = [0; 163840];
    file.read_exact(&mut buffer)?;

    let md5_hash: String = md5::compute(&buffer)
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect();

    return Ok(md5_hash);
}

fn get_enc_data() -> Result<String> {
    let date = Utc::now();
    let date_str = format!("{:04}{:02}{:02}", date.year(), date.month(), date.day());
    let time_str = format!("{:02}{:02}{:02}", date.hour(), date.minute(), date.second());

    let message = format!("ALSONG_ANDROID_{}_{}", date_str, time_str);
    let message = message.as_bytes();

    let encrypted_message = RSA_PUBLIC_KEY.encrypt(&mut OsRng, Pkcs1v15Encrypt, message)?;
    let encrypted_hex = hex::encode(encrypted_message);

    return Ok(encrypted_hex.to_uppercase());
}

pub async fn get_raw_lyric_from_path(path: &str) -> Result<String> {
    let md5_hash: String = get_md5_hash(path)?;
    let enc_data: String = get_enc_data()?;

    let client = reqwest::Client::new();
    let res = client
        .post("https://lyric.altools.com/v1/lookup")
        .header("Accept-Charset", "utf-8")
        .header("Connection", "close")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .header("User-Agent", "Android")
        .body(format!("md5={}&encData={}", md5_hash, enc_data))
        .send()
        .await?;

    if !res.status().is_success() {
        return Err(anyhow::anyhow!("Failed to get lyric"));
    }

    let body = res.text().await?;

    return Ok(body);
}
