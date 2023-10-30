import CheckIcon from "@mui/icons-material/Check";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Box, CircularProgress, TableSortLabel } from "@mui/material";
import Paper from "@mui/material/Paper";
import { styled } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { visuallyHidden } from "@mui/utils";
import _ from "lodash";
import { duration } from "moment";
import * as React from "react";
import { EnrichedSparkSQL, SparkSQLStore } from "../../interfaces/AppStore";
import { SqlStatus } from "../../interfaces/SparkSQLs";
import { humanFileSize, humanizeTimeDiff } from "../../utils/FormatUtils";
import Progress from "../Progress";
import { Data, EnhancedTableProps, HeadCell, Order } from "./TableTypes";
import { getComparator, stableSort } from "./TableUtils";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

function StatusIcon(status: string): JSX.Element {
  switch (status) {
    case SqlStatus.Running.valueOf():
      return (
        <CircularProgress
          color="info"
          style={{ width: "30px", height: "30px" }}
        />
      );
    case SqlStatus.Completed.valueOf():
      return (
        <CheckIcon color="success" style={{ width: "30px", height: "30px" }} />
      );
    case SqlStatus.Failed.valueOf():
      return (
        <ErrorOutlineIcon
          color="error"
          style={{ width: "30px", height: "30px" }}
        />
      );
    default:
      return <div></div>;
  }
}

const headCells: readonly HeadCell[] = [
  {
    id: "id",
    numeric: true,
    disablePadding: false,
    label: "id",
  },
  {
    id: "status",
    numeric: false,
    disablePadding: false,
    label: "Status",
  },
  {
    id: "description",
    numeric: false,
    disablePadding: false,
    label: "Description",
  },
  {
    id: "duration",
    numeric: false,
    disablePadding: false,
    label: "Duration",
  },
  {
    id: "coreHour",
    numeric: false,
    disablePadding: false,
    label: "Core/Hour",
  },
  {
    id: "activityRate",
    numeric: false,
    disablePadding: false,
    label: "Activity Rate",
  },
  {
    id: "input",
    numeric: false,
    disablePadding: false,
    label: "Input",
  },
  {
    id: "output",
    numeric: false,
    disablePadding: false,
    label: "Output",
  },
];

const createSqlTableData = (sqls: EnrichedSparkSQL[]): Data[] => {
  return sqls.flatMap((sql) => {
    return !sql.stageMetrics || !sql.resourceMetrics
      ? []
      : {
          id: sql.id,
          status: sql.status,
          description: sql.description,
          duration: sql.duration,
          durationPercentage: sql.resourceMetrics.durationPercentage,
          coreHour: sql.resourceMetrics.coreHourUsage,
          coreHourPercentage: sql.resourceMetrics?.coreHourPercentage,
          activityRate: sql.resourceMetrics.activityRate,
          input: sql.stageMetrics.inputBytes,
          output: sql.stageMetrics.outputBytes,
        };
  });
};

function EnhancedTableHead(props: EnhancedTableProps) {
  const { order, orderBy, onRequestSort } = props;
  const createSortHandler =
    (property: keyof Data) => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };

  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={"left"}
            padding={headCell.disablePadding ? "none" : "normal"}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : "asc"}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === "desc" ? "sorted descending" : "sorted ascending"}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

export default function SqlTable({
  sqlStore,
  selectedSqlId,
  setSelectedSqlId,
}: {
  sqlStore: SparkSQLStore | undefined;
  selectedSqlId: string | undefined;
  setSelectedSqlId: (id: string) => void;
}) {
  const [order, setOrder] = React.useState<Order>("asc");
  const [orderBy, setOrderBy] = React.useState<keyof Data>("id");
  const [sqlsTableData, setSqlsTableData] = React.useState<Data[]>([]);

  React.useEffect(() => {
    if (!sqlStore) return;

    const sqls = createSqlTableData(
      sqlStore.sqls.slice().filter((sql) => !sql.isSqlCommand),
    );
    if (_.isEqual(sqls, sqlsTableData)) return;

    setSqlsTableData(sqls);
  }, [sqlStore]);

  const handleRequestSort = (
    event: React.MouseEvent<unknown>,
    property: keyof Data,
  ) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const visibleRows = React.useMemo(
    () => stableSort(sqlsTableData, getComparator(order, orderBy)),
    [order, orderBy, sqlsTableData],
  );

  if (sqlStore === undefined) {
    return <Progress />;
  }
  return (
    <div
      style={{ width: "100%", display: "flex", justifyContent: "space-around" }}
    >
      <TableContainer
        component={Paper}
        sx={{ maxHeight: "65vh", width: "70%" }}
      >
        <Table
          stickyHeader
          aria-label="customized table"
          sx={{ margin: "auto" }}
        >
          <EnhancedTableHead
            onRequestSort={handleRequestSort}
            order={order}
            orderBy={orderBy}
          />
          <TableBody>
            {visibleRows.map((sql) => (
              <StyledTableRow
                sx={{ cursor: "pointer" }}
                key={sql.id}
                selected={sql.id === selectedSqlId}
                onClick={(event) => setSelectedSqlId(sql.id)}
              >
                <StyledTableCell component="th" scope="row">
                  {sql.id}
                </StyledTableCell>
                <StyledTableCell component="th" scope="row">
                  {StatusIcon(sql.status)}
                </StyledTableCell>
                <StyledTableCell component="th" scope="row">
                  {sql.description}
                </StyledTableCell>
                <StyledTableCell align="left">
                  {humanizeTimeDiff(duration(sql.duration))} (
                  {sql.durationPercentage.toFixed(1)}%)
                </StyledTableCell>
                <StyledTableCell align="left">
                  {sql.coreHour.toFixed(4)} ({sql.coreHourPercentage.toFixed(1)}
                  %)
                </StyledTableCell>
                <StyledTableCell align="left">
                  {sql.activityRate.toFixed(2)}%
                </StyledTableCell>
                <StyledTableCell align="left">
                  {humanFileSize(sql.input)}
                </StyledTableCell>
                <StyledTableCell align="left">
                  {humanFileSize(sql.output)}
                </StyledTableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
