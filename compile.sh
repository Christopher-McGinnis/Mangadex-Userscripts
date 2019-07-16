# echo "Making Source eslint complient"
# eslint --fix ./src
echo "Compiling Typescript"
tsc
# Typescript files are automaticly fixed as we type them.
# The generated javascript, however, is automaticly compiled into a
# non-complient format. We will fix it up as much as we can automaticly.
echo "Making Output eslint complient"
eslint --quiet --fix out
