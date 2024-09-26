#!/usr/bin/env bun
import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { UTApi } from "uploadthing/server";

const program = new Command();

const tokenPath = path.join(os.homedir(), ".cache", "upcli", "token");

program
	.name("upcli")
	.description("CLI to upload files to UploadThing")
	.version("1.0.0");

program
	.argument("<files...>", "File(s) to upload")
	.action(async (files: string[]) => {
		const tokenFile = Bun.file(tokenPath);

		if (!(await tokenFile.exists())) {
			console.error(
				"No token found. Run `bunx upt-cli login <token>` to set your token.",
			);
			process.exit(1);
		}

		const token = (await tokenFile.text()).trim();

		const utapi = new UTApi({
			apiKey: token,
		});

		const jsFiles = await Promise.all(
			files.map(async (file) => {
				const full_path = path.resolve(file);
				const f = Bun.file(full_path);
				const blob = new Blob([await f.arrayBuffer()], { type: f.type });
				const jsFile = new File([blob], file, { type: f.type });
				return jsFile;
			}),
		);

		try {
			const res = await utapi.uploadFiles(jsFiles);

			console.log("Finished uploading files");
			for (const file of res) {
				console.log("File successfully uploaded. URL is here 👉", file.data?.url);
			}
		} catch (e) {
			console.error("Failed to upload file(s):", e);
		}
	});

program
	.command("login <token>")
	.description("Set the UploadThing API token")
	.action(async (token: string) => {
		const tokenFile = Bun.file(tokenPath);

		if (!(await tokenFile.exists())) {
			await fs.mkdir(path.dirname(tokenPath), { recursive: true });
		}

		await Bun.write(tokenPath, token);
		console.log("Token saved successfully.");
	});

program.parse();
