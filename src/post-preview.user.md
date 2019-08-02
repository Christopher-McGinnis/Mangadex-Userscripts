# MangaDex Post Preview
Write your post right the first time!
___
[![Install with GreasyFork](https://img.shields.io/static/v1.svg?style=popout-square&label=Install%20with&message=GreasyFork&color=red)](https://greasyfork.org/en/scripts/381831-mangadex-preview-post) [![Bookmarklet Version](https://img.shields.io/static/v1.svg?style=flat-square&logo=GitHub&label=&message=Bookmarklet&color=grey)](https://github.com/Christopher-McGinnis/Mangadex-Userscripts/blob/master/out/post-preview.bookmarklet.js) [![View On Github](https://img.shields.io/static/v1.svg?style=flat-square&logo=GitHub&label=&message=View%20Code&color=grey)](https://github.com/Christopher-McGinnis/Mangadex-Userscripts)

As one of the more complex bbcode users, I am rather confident this supports everything you normal people want.
This can also be run in the browser console if you do not have a userscript manager.

Preview
---

![Preview Gif](https://i.imgur.com/4yyhG8h.gif)

Notes:
  * URL link generation is still WIP. It should work fine for valid urls.
  But may treat more or less URLs as valid than MD does.
  * Image URLs also may receive incorrect validity values
  * I am now validating my results by comparing them to what MD generated.
  So far it is good, though any post with an img incorrectly fails validation in userscript mode (because we use a blob src instead of the actual url)
Bugs:
  * Implicit closing of img tags is a bit messed up on MD. I have yet to try to mimic it.

Not planned:
  * @mention link generation. We do not know the user's id so we cannot generate a link, cannot be sure the user exists, so a dummy link could be misleading. And running a MD search for the user would be a waste of resources because lets face it, you do not want to visit their profile page anyways.
