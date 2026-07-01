import { copyFile, mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(repoRoot, "src", "assets");
const targetDir = path.join(repoRoot, "public", "assets");

await mkdir(targetDir, { recursive: true });

const assetFileNames = (await readdir(sourceDir)).filter((fileName) =>
    fileName.toLowerCase().endsWith(".stl"),
);

await Promise.all(
    assetFileNames.map(async (fileName) => {
        const sourcePath = path.join(sourceDir, fileName);
        const targetPath = path.join(targetDir, fileName);

        if (await filesMatch(sourcePath, targetPath)) {
            return;
        }

        await copyFile(sourcePath, targetPath);
    }),
);

async function filesMatch(sourcePath, targetPath) {
    try {
        const [source, target] = await Promise.all([
            readFile(sourcePath),
            readFile(targetPath),
        ]);

        return source.equals(target);
    } catch (error) {
        if (error?.code === "ENOENT") {
            return false;
        }

        throw error;
    }
}
