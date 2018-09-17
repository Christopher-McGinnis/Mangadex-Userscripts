# Mangadex-Userscripts
Userscripts for Mangadex

## State of development:
Currently using Atom with the custom package: [Atom-Violentmonkey-Connect](https://github.com/Christopher-McGinnis/Atom-Violentmonkey-Connect)

| |
|-|
| IDE | Atom with custom package [Atom-Violentmonkey-Connect](https://github.com/Christopher-McGinnis/Atom-Violentmonkey-Connect)
| Script Monkey | ViolentMonkey ([Chrome](https://chrome.google.com/webstore/detail/violent-monkey/jinjaccalgkegednnccohejagnlnfdag)) ([Firefox](https://addons.mozilla.org/firefox/addon/violentmonkey/))
| Browser | [Firefox](https://www.mozilla.org/en-US/firefox/new/)

Development environment works alright. Test run smoothly and updates apply instantly. Thousand times better than trying to write it in your primitive ScriptMonkey editor.

Published content is not yet processed. Published material must be manually updated by end user by deleting/reinstalling scripts.

This will be fixed soon.

I like userscripts, but haven't had a decent IDE for them until now. As I hack away at my editor, things should become easier.
I like the minimalistic nature of my current environment, but am thinking of expanding it.

Things I want include:
1. separate location for templates/long html code/other none-code stuff.
 * pro: cleaner source code
 * con: source js to result js mismatch.
    * by compiling the html to a single inline line, the effects on the output can be reduce. ie. Keep line numbers in sync for debugging.

I suspect a more complex folder structure will be required if I implement this.

###  Compilation Process:

LocalDev:

1. UserScript compile (automatic on save)
* ViolentMonkey automatically updates.

Github:
1. Library commit
* UserScript compile
* UserScript commit
* push

GreasyFork:
1. Library commit
* push
* UserScript compile
* UserScript commit
* push

---
 Planned target chain:

Github:
1. Library commit
* UserScript compile
* UserScript commit
* Push to GitGub
* Gresyfork gets UserScript updates via Github webhook. Libraries will still point to github.

I will not be hosting the libraries on GreasyFork for the time being, since updating them requires publishing library, parsing site for the unique library version link (different from the \@version tag we control), and then updating the versions links in \@require. My UserScripts will still be hosted there for easy installation however.

Github way allows us to know the location before publication so long as we do 2 step commits (automated for me). Which is why I am using it for libraries.
