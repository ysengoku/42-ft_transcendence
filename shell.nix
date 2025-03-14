with import <nixpkgs> {};
mkShell {
  venvDir = "./server/.venv";
  buildInputs = with pkgs; [
    python310Packages.python
    python310Packages.venvShellHook
    python310Packages.python-lsp-server
    python310Packages.ruff
    python310Packages.python-lsp-ruff
    python310Packages.python-magic
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
