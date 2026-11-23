# Writing for Lasting Empires

Rules for every text a player reads in an event. They are short because the screen is small.
`npm test` enforces the ones a machine can check.

## The voice

A chancellor is telling the monarch what has happened and what must be decided. He is exact, a little dry, and
never explains the joke.

1. **Speak to "you".** "Your warden has raised a second tower", not "The warden of the realm has raised…".
2. **Sixty words or fewer** for the text of an event. Titles are five words or fewer. *(Checked.)*
3. **One concrete detail** in every text: a number, a named thing, something seen. "Six falcons and a chest of
   silver cups." "The grey mare came back to the stable alone." A text with no detail is a memo.
4. **No modern words.** No "economy", "inflation", "policy", "morale", "propaganda", "crisis". Say what a person of
   the time would have seen: prices, bread, the mood of the square.
5. **The choice is in the options, not the text.** The text says what is; the options say what may be done.
   An option is what the monarch would say: "Forty days means forty", not "Maintain quarantine".
6. **Every option costs or risks something**, and the result says what it was in plain numbers
   ("Stability +1; favour with your church −8"). A hint may warn of a cost before it is paid ("costs ducats").
7. **No option is the right one.** If a choice is free and good, it is not a choice: cut it or give it a price.
8. **History is seen from the player's court**, not from a textbook: what reached you, by whom, and what they want
   of you. "The Pope watches from the Castel Sant'Angelo, and writes to every prince."

## Chains

A chain is a story in three steps (`src/engine/chains.ts`). The player chooses in step one; step two arrives years
later and is different for each road; step three closes it.

- Each step stands on its own: the player may have forgotten the first. Name the place or the person again.
- A step shows only the options that make sense on the road taken (`can` returns why the others do not).
- Every road must end. `npm test` walks all of them. *(Checked.)*
- Three steps, no more. *(Checked.)*

## People

- People at court are named in full the first time and by first name after ("Beatriz de Velasco… Beatriz…").
- Use "they" for a person of the court unless history gives the person's sex. Rival commanders, prisoners and
  historical figures may be "he" or "she" as history has them.
- A person's loyalty is shown as a number when it changes ("Loyalty is now 72").

## Where texts live

| Kind | File |
|---|---|
| The history deck and general events | `src/engine/events.ts`, `src/engine/annals.ts` |
| Court events (people) | `src/engine/court.ts` |
| Chains | `src/engine/chains.ts` |
| Helpers every event uses (`good`, `bad`, `later`, `needs`, `pay`) | `src/engine/eventkit.ts` |

Money in events goes through `scaled(s, n)` (prices rise over the centuries); never write a bare number of ducats.
