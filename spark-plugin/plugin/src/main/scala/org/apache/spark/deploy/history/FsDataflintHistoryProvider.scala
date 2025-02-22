package org.apache.spark.deploy.history

import org.apache.spark.SparkConf
import org.apache.spark.dataflint.DataflintSparkUILoader
import org.apache.spark.util.{Clock, SystemClock}

class FsDataflintHistoryProvider(conf: SparkConf, clock: Clock) extends FsHistoryProvider(conf, clock) {
  def this(conf: SparkConf) = {
    this(conf, new SystemClock())
  }

  override def getAppUI(appId: String, attemptId: Option[String]): Option[LoadedAppUI] = {
    val app = super.getAppUI(appId, attemptId)
    app.foreach(app => DataflintSparkUILoader.loadUI(app.ui))
    app
  }
}
