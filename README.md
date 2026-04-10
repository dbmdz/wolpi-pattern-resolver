# wolpi-resolving-extension

An extension for the [Wolpi IIIF image server](https://github.com/dbmdz/wolpi) that resolves identifiers to image files.

The extension allows you to define a list of patterns with one or more substitutions.
These are used for resolving identifiers to a path on the local file system or a remote HTTP endpoint.
You can specify multiple substitutions, the resolving extension will then verify which of these URIs are actually readable and return
the first matching substitution.

