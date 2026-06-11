use conway_rust::run;

fn main() {
    run(
        #[cfg(target_arch = "wasm32")]
        "canvas".to_owned(),
    )
    .unwrap();
}
