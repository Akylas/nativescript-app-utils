import ObjectiveC
import Foundation

@objc(NCompletionDelegate)
protocol NCompletionDelegate {
  func onComplete(_ result: NSObject?, error:NSError?)
  func onProgress(_ progress: Int)
}
