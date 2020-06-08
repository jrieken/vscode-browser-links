# Browser Links

Browser tabs, e.g safari, as completions in VS Code's SCM input box. When making a commit you usually reference an issue by its url. This extension reads the list of browser tabs and suggests them as completions.

![Sample](https://raw.githubusercontent.com/jrieken/vscode-browser-links/master/sample.png)


Supports `Edge`, `Safari`, and `Chrome` but `macOS` only!


#### Configuration

* `browser-links.browser` - Which browser to use, values are `Safari` (default),` Microsoft Edge`, and `Google Chrome`
* `browser-links.pattern` - A regular expression that filters browser tabs, e.g `https://github.com/.+/issues/.+` to only see GitHub issue


#### Notes

1. This extension uses AppleScript and therefore only works on macOS.
1. macOS Catalina will ask for permissions to interact with the selected browser.
