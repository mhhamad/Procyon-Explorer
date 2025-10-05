// dzi-maker.js
// Script to generate Deep Zoom Image (DZI) tiles from a large image using Sharp (manually))
import sharp from "sharp";
import fs from "fs/promises"; // file system library
import path from "path";

const inputImage = "./assets/test-image-1.tif"; // ← CHANGE THIS!
const dziName = path.join("./public/tiles/test1", "image"); // ← CHANGE THIS!

console.log("🚀 Starting tile generation...");

try {
  await sharp(inputImage, { limitInputPixels: false })
    .tile({
      size: 256,
      overlap: 2, //  2px overlap for better visual quality
      container: "fs", // Explicit filesystem output
      layout: "dz",
    })
    .toFile(dziName);

  console.log("✅ Tiles generated successfully!");
  console.log("📁 Files created:");
  console.log(dziName, ".dzi");
  console.log(dziName, "_files (tiles folder)");
} catch (err) {
  console.log("❌ Tile generation failed", err.message);
}
