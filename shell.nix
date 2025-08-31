with import <nixpkgs> {};
mkShell {
  venvDir = "./server/.venv";
  buildInputs = with pkgs; [
    python311
    python311Packages.venvShellHook
    python311Packages.python-lsp-server
    python311Packages.ruff
    python311Packages.python-lsp-ruff
    python311Packages.python-magic
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
