# Privacy

Dot-Man can send anonymous statistics about your runs to help balance the game. This page says exactly what is sent and how to stop it.

## What is sent

When a run ends (game over, run complete, quit, or a run that was closed mid-way), the game sends that run's statistics:

- how far you got, the pellets you collected, your time on each level, the upgrades you took and offered, deaths (which ghost, where on the board), fruit, quarters, store purchases and similar game numbers;
- a random install id created by the game in your browser (not linked to any account);
- the game version and platform (web, itch.io or Steam);
- your country (two letters), as reported by Cloudflare.

## What is not sent

- No name, account, email or contact details.
- No IP address is stored. The server keeps only a one-way keyed hash of it, used to rate-limit uploads.
- Nothing from runs played before this feature shipped, and nothing from debug or test builds.

## Turning it off

Open **Settings** and untick **SHARE RUN STATS**. From then on nothing is sent from that browser.

## Deleting your data

Settings shows the first 8 characters of your install id next to the checkbox. Send those characters to the developer (open an issue at https://github.com/katerberg/pac-rogue/issues) and every run stored for that id will be deleted.

## Where it is stored

In a Cloudflare D1 database owned by the developer, used only to improve the game and to build the global high-score board.
