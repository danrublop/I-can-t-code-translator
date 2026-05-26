// On-device OCR helper for Llamas Remote.
//
// Reads an image file and prints the recognized text to stdout, one line per recognized
// text observation. Uses Apple's Vision framework (VNRecognizeTextRequest) — fully on
// device, no network, no model download, no LLM. This is the "grab the text out of a
// screenshot without spinning up a vision model" path.
//
// Usage:  ocr <image-path>
// Exit:   0 ok (text on stdout, may be empty), 1 load/recognition error, 2 bad args.
//
// Built at package time via `swiftc -O build-resources/ocr.swift -o build-resources/ocr`
// and bundled as an extraResource; resolved at runtime by services/vision/ocr.ts.

import Foundation
import Vision
import AppKit

let args = CommandLine.arguments
guard args.count > 1 else {
    FileHandle.standardError.write("usage: ocr <image-path>\n".data(using: .utf8)!)
    exit(2)
}

let path = args[1]
guard let image = NSImage(contentsOfFile: path),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("could not load image at \(path)\n".data(using: .utf8)!)
    exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
    try handler.perform([request])
} catch {
    FileHandle.standardError.write("ocr failed: \(error)\n".data(using: .utf8)!)
    exit(1)
}

let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
FileHandle.standardOutput.write(lines.joined(separator: "\n").data(using: .utf8)!)
exit(0)
