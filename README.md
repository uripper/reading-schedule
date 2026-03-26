
# ![Bartleby Logo](BartlebyHeader.png)

*Read More Books.*

## About

Bartleby is a personal **reading schedule optimizer** that generates a daily reading plan based on your book backlog. Let it know what you want to read, how fast you read, how much time you have, and it will create a schedule that fits you.

## Why?

Bartleby was mainly built for myself. I wanted to visually see just how many books a year I could read with a small time commitment each day. I'm a fairly slow reader, and I have severe ADHD, which makes it pretty hard to believe that I can make meaningful progress on my backlog. And having a giant backlog of books doesn't feel as life affirming to me as it is for [Umberto Eco and Nassim Nicholas Taleb](https://en.wikipedia.org/wiki/Antilibrary). Ultimately, this became a fun way to get myself to read more. I hope that others find it useful too.

## Current Status

The app is in a very early stage of a Tauri application. The algorithm is very basic, and the UI is still undesigned. Core features are there but it is missing a ton of polish and quality of life features which can sometimes make it frustrating to be used.

## Issue Information

Issues are currently handled on GitHub, but also have a folder on the filesystem for easier local management: `issues/`. Each issue is a markdown file with a title, description, and acceptance criteria. The issue number is the filename (e.g., `1.md` for issue #1). This is probably going to change in the future, but I like using it like this for now.

You can run `just sync` or `pnpm issues:sync` to sync issues between GitHub and the local filesystem. This will create new files for any new issues on GitHub, and update existing files with any changes. It will also create new issues on GitHub for any new files in the `issues/` folder. Moving from Open to Closed in the folder will also Close the issue on GitHub. I don't have justifications for doing this this way.
