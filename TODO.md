# TODO

- Better game orchestrator architecture - shouldnt need to load from db so often
- Better handling of game loop to handle edge cases where server is paused. i.e. the game orchestrator should have a process that is pulling from active games that have an AI move to make and executing it, rather than in a constant recursive stack check.
- Store analytics like death card, moves per turn

