with import <nixpkgs> {};
mkShell {
  venvDir = "./server/.venv";
  buildInputs = with pkgs; [
    python310
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
    export LD_LIBRARY_PATH+=${stdenv.cc.cc.lib}/lib/
    unset SOURCE_DATE_EPOCH
  '';
}
