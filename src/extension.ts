import * as vscode from 'vscode';
import * as cp from 'child_process';

export function activate(context: vscode.ExtensionContext) {

	if (process.platform !== 'darwin') {
		console.warn(`${context.extensionUri} is MAC only.`);
		return;
	}

	interface TabInfo {
		title: string;
		url: string;
		current: boolean;
	}

	context.subscriptions.push(vscode.languages.registerCompletionItemProvider('scminput', new class implements vscode.CompletionItemProvider {

		async provideCompletionItems(_document: vscode.TextDocument, _position: vscode.Position): Promise<undefined | vscode.CompletionItem[]> {

			let filter: RegExp | undefined;
			const config = vscode.workspace.getConfiguration('browser-links');
			const pattern = config.get<string>('pattern');
			if (pattern) {
				try {
					filter = new RegExp(pattern);
				} catch { }
			}

			const browser = config.get<string>('browser');
			const tabs = await this._getBrowserTabs(browser);
			const result: vscode.CompletionItem[] = [];

			for (let tab of tabs) {
				if (filter && !filter.test(tab.url)) {
					continue;
				}
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

		private _scripts: Record<string, string> = {
			'Safari': context.asAbsolutePath('./get_safari_links.scpt'),
			'Microsoft Edge': context.asAbsolutePath('./get_edge_links.scpt'),
			'Google Chrome': context.asAbsolutePath('./get_chrome_links.scpt'),
		};

		private _getBrowserTabs(browser?: string): Promise<TabInfo[]> {

			const script = this._scripts[browser || "Safari"];

			return new Promise<TabInfo[]>((resolve, reject) => {

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
						result.push({
							title: lines[i],
							url: lines[i + 1],
							current: lines[i + 2] === 'true'
						});
					}
					resolve(result);
				});
			});
		}
	}));
}
