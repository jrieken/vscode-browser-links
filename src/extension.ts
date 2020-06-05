import * as vscode from 'vscode';
import * as cp from 'child_process';
import { URL } from 'url';
import { basename } from 'path';

export function activate(context: vscode.ExtensionContext) {

	interface TabInfo {
		title: string;
		url: string;
		current: boolean;
	}

	context.subscriptions.push(vscode.languages.registerCompletionItemProvider('scminput', new class implements vscode.CompletionItemProvider {

		async provideCompletionItems(_document: vscode.TextDocument, _position: vscode.Position): Promise<undefined | vscode.CompletionItem[]> {
			const tabs = await this._getSafariTabs();
			return tabs.map(tab => {
				const item = new vscode.CompletionItem(tab.url);
				item.kind = vscode.CompletionItemKind.Text;
				item.detail = tab.title;
				item.preselect = tab.current;
				return item;
			});
		}

		private _getSafariTabs(): Promise<TabInfo[]> {
			return new Promise<TabInfo[]>((resolve, reject) => {

				const osa = cp.spawn('/usr/bin/osascript', [context.asAbsolutePath('./get_safari_links.scpt')]);
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
							current: Boolean(lines[i + 2])
						});
					}
					resolve(result);
				});
			});
		}
	}));
}
