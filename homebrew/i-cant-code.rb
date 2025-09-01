cask "i-cant-code" do
  version "1.0.6"
  sha256 "a8436f0a6927003ba4fa2be79c34a810758758613a96c8134620348496734a45"

  url "https://your-domain.com/downloads/i-cant-code-mac.dmg"
  name "i cant code"
  desc "AI-powered code explanations using local language models"
  homepage "https://your-domain.com"

  livecheck do
    url "https://your-domain.com/api/latest-version"
    strategy :json do |json|
      json["version"]
    end
  end

  depends_on formula: "ollama"

  app "i cant code.app"

  postflight do
    system_command "/usr/local/bin/ollama",
                   args: ["pull", "mistral"],
                   sudo: false
  end

  uninstall quit: "com.icantcode.app"

  zap trash: [
    "~/Library/Application Support/i cant code",
    "~/Library/Preferences/com.icantcode.app.plist",
    "~/Library/Saved Application State/com.icantcode.app.savedState",
  ]
end
