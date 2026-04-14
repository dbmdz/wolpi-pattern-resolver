# wolpi-resolving-extension

An extension for the [Wolpi IIIF image server](https://github.com/dbmdz/wolpi) that resolves identifiers to image files.

The extension allows you to define a list of patterns with one or more substitutions.
These are used for resolving identifiers to a path on the local file system or a remote HTTP endpoint.
You can specify multiple substitutions - the resolving extension will then verify if the corresponding resource actually exists and return
the first matching substitution.

The extension supports HTTP caching by returning an ETag value and last-modified timestamp for the resolved resources and matching them against the cache headers from the client request.

## Usage
Create a directory called `images` in your working directory and save the image file `wolpi.png` to it.

Configure the resolving extension in your `wolpi.yml`:
```yaml
extensions:
  - npm:
      pkg: "@mdz/wolpi-resolving-extension"
      version: "0.0.1"
    config:
      resolvingPatterns:
        - pattern: ^test-(\w+)$
          substitutions:
            - '/images/$1.tif'
            - '/images/$1.jpg'
            - '/images/$1.png'
```

Start the Wolpi container, mounting the image directory and your custom `wolpi.yml`:
```bash
docker run -p 8080:8080 \
    -v "./wolpi.yml:/app/wolpi.yml" \
    -v "./images:/images" \
    ghcr.io/dbmdz/wolpi:latest
```

You can now access the image at http://localhost:8080/v3/test-wolpi/full/max/0/default.jpg.

## Development
### Live Reload
Install dependencies:
```bash
npm install
```

Watch source files for changes and recompile if necessary:
```bash
npm run dev
```

Configure live reloading and resolving patterns for your extension in `wolpi.yml`:
```yml
extensions:
  - path: /app/extensions/resolving/
    live-reload: true
    config:
      resolvingPatterns:
        - pattern: ^(\w{3}\d{8})_(\d{5})$
          substitutions:
            - '/images/$1/original/$1_$2.tif'
            - '/images/$1/300/$1_$2.jpg'
            - '/images/$1/150/$1_$2.jpg'
```

Start Wolpi container, mounting compiled package files and image directory as well as custom `wolpi.yml`:
```bash
docker run -p 8080:8080 \
    -v "./src:/app/extensions/resolving/src" \
    -v "./package.json:/app/extensions/resolving/package.json" \
    -v "./wolpi.yml:/app/wolpi.yml" \
    -v "./images:/images" \
    ghcr.io/dbmdz/wolpi:latest
```

### Debugging
Additionally enable debugging in your `wolpi.yml` and make sure that the path to your extension in the container exactly matches the path on your local machine:
```yaml
extension-debug:
    enabled: true
    host: 0.0.0.0
    port: 4711
    suspend: false
    waitAttached: false

extensions:
  - path: /my/local/path/to/wolpi-resolving-extension/
    live-reload: true
    config:
      resolvingPatterns:
        - pattern: ^(\w{3}\d{8})_(\d{5})$
          substitutions:
            - '/images/$1/original/$1_$2.tif'
            - '/images/$1/300/$1_$2.jpg'
            - '/images/$1/150/$1_$2.jpg'
```

Start Wolpi container, mounting compiled package files and image directory as well as custom `wolpi.yml`. This time, we also expose the debugging port 4711 and we mount the package to the same path as on our local machine:
```bash
docker run -p 8080:8080 \
    -p 4711:4711 \
    -v "./src:$(realpath ./src)" \
    -v "./package.json:$(realpath ./package.json)" \
    -v "./wolpi.yml:/app/wolpi.yml" \
    -v "./images:/images" \
    ghcr.io/dbmdz/wolpi:latest
```
// TODO: Add link to Wolpi DAP documentation

Attach to the debugging server as described here and make sure to set your breakpoints in the compiled javascript file (`src/index.js`).

### Testing
Run tests:
```bash
npm run test
```

The `wolpi` and `Java` globals as well as the modules `wolpi:fs` and `wolpi:fetch`, which are provided by Wolpi at runtime, are mocked in `./test/setup.ts`.


## License

MIT