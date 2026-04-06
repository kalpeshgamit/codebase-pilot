class CodebasePilot < Formula
  desc "AI context engine — pack, compress, and optimize any codebase for LLMs"
  homepage "https://github.com/kalpeshgamit/codebase-pilot"
  license "MIT"

  depends_on "node@18"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  def caveats
    <<~EOS
      codebase-pilot is installed!

      Quick start:
        codebase-pilot init          # scan project + generate configs
        codebase-pilot pack --compress  # pack for AI context
        codebase-pilot ui            # web dashboard → http://localhost:7456

      Docs: https://github.com/kalpeshgamit/codebase-pilot
    EOS
  end

  test do
    assert_match "0.2.0", shell_output("#{bin}/codebase-pilot --version")
  end
end
