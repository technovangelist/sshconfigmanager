// ssh_config_manager.ts
import { parse } from "https://deno.land/std/flags/mod.ts";
import { exists } from "https://deno.land/std/fs/mod.ts";

interface SSHConfig {
	Host: string;
	IdentityFile?: string;
	User?: string;
	HostName?: string;
}

const homeDir = Deno.env.get("HOME");
const configFile = `${homeDir}/.ssh/config`;

async function readSSHConfig(): Promise<SSHConfig[]> {
	if (await exists(configFile)) {
		const fileContent = await Deno.readTextFile(configFile);
		return fileContent
			.split("\n\n")
			.filter((block) => block.trim() !== "")
			.map((block) => {
				const lines = block.split("\n");
				const config: SSHConfig = { Host: "" };

				for (const line of lines) {
					const [key, value] = line.split(" ");
					if (key === "Host") {
						config.Host = value;
					} else {
						config[key as keyof SSHConfig] = value;
					}
				}

				return config;
			});
	}

	return [];
}

function sshConfigBlock(config: SSHConfig): string {
	let block = `Host ${config.Host}\n`;

	for (const key in config) {
		if (key !== "Host" && config[key as keyof SSHConfig] !== undefined) {
			block += `${key} ${config[key as keyof SSHConfig]}\n`;
		}
	}

	return block;
}

async function writeSSHConfig(configs: SSHConfig[]): Promise<void> {
	configs.sort((a, b) => a.Host.localeCompare(b.Host));

	const fileContent = configs.map(sshConfigBlock).join("\n\n");
	await Deno.writeTextFile(configFile, fileContent);
}

function printConfig(config: SSHConfig): void {
	for (const key in config) {
		if (config[key as keyof SSHConfig] !== undefined) {
			console.log(`${key}: ${config[key as keyof SSHConfig]}`);
		}
	}
}

async function prompt(
	existingConfig: SSHConfig,
	newConfig: SSHConfig,
): Promise<boolean> {
	console.log("Current configuration:");
	printConfig(existingConfig);
	console.log("\nProposed configuration:");
	printConfig(newConfig);
	console.log("\nDo you want to update this host? [y/N] ");

	const buf = new Uint8Array(1024);
	const n = <number>await Deno.stdin.read(buf);
	const answer = new TextDecoder()
		.decode(buf.subarray(0, n))
		.trim()
		.toLowerCase();
	return answer === "yes" || answer === "y";
}

async function main() {
	const args = parse(Deno.args, {
		string: ["host", "identityFile", "user", "hostname"],
		boolean: ["autoaccept"],
	});

	if (!args.host) {
		console.error("Host argument is required");
		Deno.exit(1);
	}

	const newConfig: SSHConfig = {
		Host: args.host,
		IdentityFile: args.identityFile,
		User: args.user,
		HostName: args.hostname,
	};

	const configs = await readSSHConfig();
	const existingConfig = configs.find((config) => config.Host === args.host);

	if (existingConfig) {
		const proceed =
			args.autoaccept || (await prompt(existingConfig, newConfig));

		if (proceed) {
			console.log(`Updating existing host: ${args.host}`);
			Object.assign(existingConfig, newConfig);
			await writeSSHConfig(configs);
			console.log("SSH config updated successfully!");
		} else {
			console.log("Operation canceled.");
		}
	} else {
		console.log(`Adding new host: ${args.host}`);
		configs.push(newConfig);
		await writeSSHConfig(configs);
		console.log("SSH config updated successfully!");
	}
}

main();
