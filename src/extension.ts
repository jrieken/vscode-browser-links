import * as vscode from 'vscode';
import * as cp from 'child_process';

export function activate(context: vscode.ExtensionContext) {

	if (process.platform !== 'darwin') {
		console.warn(`${context.extensionUri} is MAC only.`);
		return;
	}

	type BrowserName = 'Safari' | 'Microsoft Edge' | 'Google Chrome';

	class TabInfo {

		private static _scripts: Record<BrowserName, string> = {
			'Safari': context.asAbsolutePath('./get_safari_links.scpt'),
			'Microsoft Edge': context.asAbsolutePath('./get_edge_links.scpt'),
			'Google Chrome': context.asAbsolutePath('./get_chrome_links.scpt'),
		};

		static async retrieve() {

			const config = vscode.workspace.getConfiguration('browser-links');
			const browser = config.get<BrowserName>('browser', 'Safari');
			const script = this._scripts[browser];

			if (!script) {
				console.log(`INVALID browser name: ${browser}`);
				return [];
			}

			const all = await new Promise<TabInfo[]>((resolve, reject) => {

				const osa = cp.spawn('/usr/bin/osascript', [script]);
				let raw = '';
				osa.stderr.on('data', data => raw += String(data));
				osa.on('error', reject);

				osa.on('exit', code => {
					if (code !== 0) {
						reject(code);
						return;
					}
					const result: TabInfo[] = [];
					const lines = raw.trim().split('\n');
					for (let i = 0; i < lines.length; i += 3) {
						result.push(new TabInfo(
							lines[i],
							lines[i + 1],
							lines[i + 2] === 'true'
						));
					}
					resolve(result);
				});
			});

			let filter: RegExp | undefined;
			const pattern = config.get<string>('pattern');
			if (pattern) {
				try {
					filter = new RegExp(pattern);
				} catch { }
			}

			if (!filter) {
				return all;
			}

			return all.filter(tab => filter!.test(tab.url));
		}

		constructor(
			readonly title: string,
			readonly url: string,
			readonly current: boolean,
		) { }
	}

	// --- completions for the SCM input box

	context.subscriptions.push(vscode.languages.registerCompletionItemProvider('scminput', new class implements vscode.CompletionItemProvider {

		async provideCompletionItems(_document: vscode.TextDocument, _position: vscode.Position): Promise<undefined | vscode.CompletionItem[]> {

			const tabs = await TabInfo.retrieve();
			const result: vscode.CompletionItem[] = [];

			for (let tab of tabs) {
				const item = new vscode.CompletionItem({ label: tab.title, description: tab.url });
				item.kind = vscode.CompletionItemKind.Issue;
				item.insertText = tab.url;
				item.detail = tab.url;
				item.documentation = tab.title;
				item.preselect = tab.current;
				result.push(item);
			}

			return result;
		}
	}));

	// --- command to start working browser tab

	context.subscriptions.push(vscode.commands.registerCommand('browser-links.startWorking', async () => {

		type Pick = vscode.QuickPickItem & { tab: TabInfo; };

		const picks = TabInfo.retrieve().then(tabs => {
			const picks: Pick[] = [];
			for (const tab of tabs) {
				const pick: Pick = {
					label: tab.title,
					detail: tab.url,
					tab
				};
				if (tab.current) {
					picks.unshift(pick);
				} else {
					picks.push(pick);
				}
			}
			return picks;
		});

		const pick = await vscode.window.showQuickPick(picks, { placeHolder: 'Select an item to start working on' });
		if (!pick) {
			return;
		}
		try {
			await vscode.commands.executeCommand('issue.startWorking', vscode.Uri.parse(pick.tab.url));
		} catch (err) {
			console.error('FAILED to start working on issue');
			console.error(err);
		}
	}));
}
