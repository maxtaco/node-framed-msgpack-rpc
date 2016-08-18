## v1.1.10 (2016-08-17)

Bugfix:
 * Fix crasher in _packetizer_error failure path

## v1.1.9 (2015-08-22)

Features:
  * Add `generic_handler` which can handle any method and will do the
    switching itself.

## v1.1.8 (2015-08-17)

Features:
  * Typed error classes, start to roll them out
  * Ability to wrap an error in a subclass if you want to handle it as 
    something other than a string before it's output via msgpack
