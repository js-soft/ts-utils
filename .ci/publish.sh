set -e
set -x

if [ -z "$VERSION" ]; then
    echo "The environment variable 'VERSION' must be set."
    exit 1
fi

if printf -- "$VERSION" | grep -q " "; then
    echo '$VERSION must not contain whitespaces'
    exit 1
fi

npm version $VERSION --no-git-tag-version
npm publish
