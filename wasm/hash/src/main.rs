use md5;
use std::fs;
use std::time::{SystemTime};

fn main() {
  println!("hash");
  let sy_time = SystemTime::now();
  let content = fs::read("msdn_win7_ultimate_x64.iso").unwrap();
  println!("{:x}", md5::compute(content));
  println!("{:?}", SystemTime::now().duration_since(sy_time).unwrap().as_secs());
  println!("{:?}", sy_time.elapsed().unwrap().as_secs());
}
