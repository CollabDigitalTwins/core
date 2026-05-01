"use client";

import * as React from "react";
import { PointCloudTable } from "./PointCloudTable";
import UploadPointCloudPage from "./PointCloudUploadPanel";

type StatusFilter = "all" | "uploaded" | "converted" | "not-converted";

enum PAGE {
  TABLE = "table",
  UPLOAD = "upload",
}

export function PointCloudManagementTable() {
  const [currentPage, setCurrentPage] = React.useState<PAGE>(PAGE.TABLE)

  return(
    <div>
      {currentPage == PAGE.TABLE ? 
        <PointCloudTable
          onUploadButtonClick = {() => setCurrentPage(PAGE.UPLOAD)}
        />
          :
        <UploadPointCloudPage
          onGoBackButtonClick = {() => setCurrentPage(PAGE.TABLE)}
        />
      }
    </div>
  )
}

