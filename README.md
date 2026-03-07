test - cole push

echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo '[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init - zsh)"' >> ~/.zshrc

home = /Users/lukepitstick/.pyenv/versions/3.12.7/bin
include-system-site-packages = false
version = 3.12.7
executable = /Users/lukepitstick/.pyenv/versions/3.12.7/bin/python3.12
command = /Users/lukepitstick/.pyenv/versions/3.12.7/bin/python -m venv /Users/lukepitstick/Projects/hackathon/brickme/.venv
