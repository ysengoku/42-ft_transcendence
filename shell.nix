with import <nixpkgs> {};
mkShell {
  venvDir = "./server/.venv";
  buildInputs = with pkgs.python3Packages; [
    python
    venvShellHook
    python3Packages.python-lsp-server
    ruff
    python3Packages.python-lsp-ruff
  ];
  postVenvCreation = ''
    unset SOURCE_DATE_EPOCH
    pip install -r ./server/requirements.txt
  '';
  postShellHook = ''
    # allow pip to install wheels
    unset SOURCE_DATE_EPOCH
  '';
}
