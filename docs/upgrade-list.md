# Upgrade list

Mirrored inventory of every upgrade's card text. Cross-cutting rules: [upgrades.md](./upgrades.md). Values and mechanics: `UPGRADE_DEFS` in [`src/domain/upgrades.ts`](../src/domain/upgrades.ts). `registrySync.test.ts` fails when a row drifts.

## Upgrade table

Base and enhanced effects side by side (the one-line card text from each def).

<!-- prettier-ignore -->
| Id | Label | School | Base | Enhanced (`<id>Plus`) |
| --- | --- | --- | --- | --- |
| `powerPelletFreeze` | Freeze | disruption | Chomp a power pellet and the nearest ghost locks solid for 3s (shortening toward 2s by level 5). | Chomp a power pellet and the nearest ghost locks solid for 5s (shortening toward ~3.3s by level 5). |
| `passiveAfterburner` | Afterburner | speed | Cleared corridors light your tail: +30% speed there, 20% slower over pellets. | Cleared corridors roar: +50% speed there, 20% slower over pellets. |
| `passiveGhostSlow` | Ghost Slow | disruption | The hunt softens. Ghosts drag their feet. | The hunt crawls. Ghosts wade through syrup. |
| `powerPelletScatterBurst` | Scatter Burst | disruption | Power pellet flings every ghost into its corner. | Power pellet flings every ghost into its corner and pins it there. |
| `powerPelletGhostRecall` | Ghost Recall | disruption | Power pellet yanks the nearest ghost straight home. | Power pellet yanks the two nearest ghosts straight home. |
| `powerPelletWarpFarthest` | Warp Farthest | protection | Power pellet flings you to the spot farthest from the ghosts. | Power pellet flings you to the spot farthest from the ghosts, shielded for a moment. |
| `passivePickupRange` | Pickup Range | automation | You eat pellets up to 1 tile away without touching them. | You eat pellets up to 2 tiles away without touching them. |
| `passiveGhostHouseDelay` | House Delay | disruption | Ghosts linger longer in the house before the hunt. | Ghosts sulk in the house far longer before the hunt. |
| `passiveExtraLife` | Extra Life | death | One more chance, and lives regenerate up to 4. | Two more chances, and lives regenerate up to 5. |
| `passivePelletToPower` | Pellet Surge | automation | Each board, one regular pellet becomes a power pellet. | Each board, two regular pellets become power pellets. |
| `powerPelletExtraHungry` | Extra Hungry | automation | Power pellets also eat the 8 pellets farthest from you. | Power pellets also eat the 14 pellets farthest from you. |
| `powerPelletWallPass` | Wall Pass | speed | Power pellet lets you slip through walls for 6s (shortening 0.5s a level to 4s). | Power pellet lets you slip through walls and loop around the maze edges for 6s (shortening to 4s by level 5). |
| `powerPelletSpeedBurst` | Speed Burst | speed | Power pellet spikes your pace for a few seconds. | Power pellet spikes your pace hard for a few seconds. |
| `powerPelletInvuln` | Ghost Proof | protection | Power pellet lets you pass through ghosts for 4s. | Power pellet lets you pass through ghosts for 5s (shortening toward ~3.8s by level 5). |
| `powerPelletGhostHarvester` | Ghost Harvester | automation | Power pellets make ghosts eat pellets for you for 5 seconds. | Power pellets make ghosts eat pellets for you for 8 seconds. |
| `fruitPowerPellet` | Fruit Power (rare) | harvest | Fruit fires a random one of your power-pellet effects. | Fruit fires every power-pellet effect you own. |
| `fruitQuarterBounty` | Quarter Bounty | harvest | Fruit pays a Quarter instead of adding pennies. | Fruit pays two Quarters. |
| `fruitFecundity` | Fruit Fecundity | harvest | Fruit lingers twice as long. | Fruit waits until the level ends, and uncollected ones pile up side by side. |
| `fruitFeast` | Fruit Feast | harvest | Fruit appears three times per level, each after the last is gone. | Fruit appears four times per level, each after the last is gone. |
| `passiveDeathsHarvest` | Death's Harvest | death | Dying harvests nearby pellets. | Dying harvests pellets within ten tiles. |
| `passiveOvercharge` | Overcharge (rare) | neutral | Doubles the duration of every other power pellet timer you're running. | Triples the duration of every other power pellet timer you're running. |
| `passiveTunnelDash` | Tunnel Dash | speed | Tunnels move you the instant you touch them. | Tunnels move you the instant you touch them, and ghosts crawl through them. |
| `passivePowerPelletRecharge` | Second Chomp | harvest | The first two power pellets you eat each level regenerate after ten seconds. | The first four power pellets you eat each level regenerate after seven seconds. |
| `passiveRemoteTransference` | Remote Transference | automation | Every 5th pellet you eat also eats the farthest pellet. | Every 3rd pellet you eat also eats the farthest pellet. |
| `passiveMyogenesis` | Myogenesis | death | Regenerate one life every level. | Refill every empty life slot on level clear. |
| `passiveDefyDeath` | Defy Death | death | Eat a power pellet: die within 5s and keep your life. | Eat a power pellet: die within 8s and keep your life. |
| `passiveTurnTuning` | Turn Tuning | speed | Tap turns up to two tiles early. Nail the beat for a speed kick. | Tap turns early, wider beat, longer speed kick. |
| `passiveDeathsBounty` | Death's Bounty | death | Dying pays a Quarter, a little less for each death on a level. | Dying pays a Quarter, barely less for each death on a level. |
| `passiveMoneyTalks` | Money Talks | death | Die on your last life: pay 3 Quarters to keep it. | Die on your last life: pay 1 Quarter to keep it. |
| `passiveLazyLooper` | Lazy Looper (rare) | speed | Only the outer pellet ring and the pellets beside the ghost house clear the board. | Only the outer pellet ring must be eaten to clear the board. |
| `passiveShieldPellets` | Shield | protection | Power pellets provide a shield. A ghost hit breaks it. | Power pellets provide a shield. Store up to 3. Each ghost hit breaks one. |
| `passiveDeathSpecialist` | Death Specialist | death | Own 3 other Death upgrades and every Death upgrade is enhanced. | Every Death upgrade you own is enhanced. |
| `passiveHarvestSpecialist` | Harvest Specialist | harvest | Own 3 other Harvest upgrades and every Harvest upgrade is enhanced. | Every Harvest upgrade you own is enhanced. |
| `passiveSpeedSpecialist` | Speed Specialist | speed | Own 3 other Speed upgrades and every Speed upgrade is enhanced. | Every Speed upgrade you own is enhanced. |
| `passiveAutomationSpecialist` | Automation Specialist | automation | Own 3 other Automation upgrades and every Automation upgrade is enhanced. | Every Automation upgrade you own is enhanced. |
| `passiveProtectionSpecialist` | Protection Specialist | protection | Own 3 other Protection upgrades and every Protection upgrade is enhanced. | Every Protection upgrade you own is enhanced. |
| `passiveDisruptionSpecialist` | Disruption Specialist | disruption | Own 3 other Disruption upgrades and every Disruption upgrade is enhanced. | Every Disruption upgrade you own is enhanced. |
| `passiveReanimation` | Reanimation | death | You respawn where you fell. | You respawn next to a power pellet if available. |
| `passiveInterest` | Interest | automation | Entering a store pays 1 Quarter for every 3 you hold. | Entering a store pays 1 Quarter for every 2 you hold. |
| `passiveNearMiss` | Near Miss | protection | Ghosts that brush past without catching you earn pennies. | Ghosts that brush past without catching you earn double pennies. |
| `passiveHaunting` | Haunting | death | The ghost that last caught you stays caged in the ghost house for 10 seconds. | The ghost that last caught you stays caged in the ghost house for the level. |
| `passiveTunnelSanctuary` | Tunnel Sanctuary | protection | Leaving a tunnel makes you ghost-proof for a second, but ghosts speed through them. | Leaving a tunnel makes you ghost-proof for a second, and ghosts can't use tunnels. |
| `passiveStreakEngine` | Streak Engine (rare) | harvest | Every 30-pellet streak fires your power-pellet effects. | Every 30-pellet streak fires your power-pellet effects and grants Ghost Proof. |
| `passiveEcho` | Echo (rare) | automation | Power pellets fire a random one of your power effects again 3 seconds later. | Power pellets fire all of your power effects again 3 seconds later. |
| `powerPelletHunter` | Hunter (rare) | disruption | Power pellets frighten ghosts. Eat them! | Power pellets frighten ghosts. Eaten ghosts stay home until the fright ends. |
| `passiveStartingShield` | Starting Shield | protection | Start every level with a shield. A ghost hit breaks it. | Start every level with 2 shields. Each ghost hit breaks one. |
| `powerPelletHyperspeed` | Hyperspeed (rare) | speed | Power pellet: for 2s, run at 10x speed. Every turn costs a beat. | Power pellet: for 3s, run at 10x speed. A shield blocks one catch for 2s. |
| `passiveShieldBreak` | Shield Break (rare) | protection | When a shield breaks, fire all power pellet effects. Power pellet effects no longer trigger at pickup. | When a shield breaks, fire all power pellet effects. Getting a shield at your maximum fires them too. |
| `powerPelletCornucopia` | Cornucopia | harvest | Power pellet: spawns a fruit, if none is out. | Power pellet: spawns an extra fruit even if there are others. |
| `powerPelletWallDrop` | Wall Drop | protection | Power pellet: your next reversal drops a wall behind you for 8s. | Power pellet: your next reversal drops a wall behind you for the level. Walk through it to remove it. |
| `powerPelletProgrammer` | Programmer (rare) | automation | Power pellet: stop and program 5 turns, then blast through them at hyperspeed. | Power pellet: stop and program 5 turns, blast through them at hyperspeed, then program and run 5 more. |
| `passiveInheritance` | Inheritance | death | Clear a level: gain a Quarter for each empty life slot. | Clear a level: gain a Quarter for each time you died on it. |
| `powerPelletMirror` | Mirror (rare) | harvest | Power pellet: a mirror twin runs the far side of the level, eating as you do. Ghosts hunt the nearest of you. If you touch your twin it pops. | Power pellet: a mirror twin runs the far side of the level, eating as you do. A catch only pops the twin. If you touch your twin it pops. |
| `powerPelletChaff` | Chaff | automation | Power pellet: drops a fake you in the center. Ghosts chase it until they touch it. | Power pellet: drops a fake you in each corner. Ghosts chase the nearest one. |
| `passiveReactiveArmor` | Reactive Armor | protection | When a shield breaks, the ghost that touched you is sent to the ghost house. | When a shield breaks, all nearby ghosts are sent to the ghost house. |
| `powerPelletTithe` | Tithe | harvest | Power pellet: move 10% slower for 5 seconds, but pellets count double toward your streak. | Power pellet: move 10% slower for 8 seconds, but pellets count double toward your streak. |
