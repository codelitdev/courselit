// import React from "react";
// import PropTypes from "prop-types";
// import { Grid } from "@material-ui/core";

// const ReactTemplateLayout = props => {
//   const { layout } = props;

//   if (!layout) {
//     return <>Prop 'layout' is not provided.</>;
//   }

//   const { width, rows } = layout;

//   return <>{parseBlock({ width, rows })}</>;
// };

// const parseBlock = ({ width, rows }) => {
//   return (
//     <Grid
//       container
//       xs={width.xs}
//       sm={width.sm}
//       md={width.md}
//       lg={width.lg}
//       xl={width.xl}
//     >
//       {parseRows({ rows })}
//     </Grid>
//   );
// };

// const parseRows = ({ rows }) => {
//   const parsedRows = [];

//   for (const row of rows) {
//     const rowElements = [];

//     if (Array.isArray(row)) {
//       const parsedRow = [];

//       for (const item of row) {
//         parsedRow.push(
//           <Grid
//             container
//             item
//             xs={item.width.xs}
//             sm={item.width.sm}
//             md={item.width.md}
//             lg={item.width.lg}
//             xl={item.width.xl}
//           >
//             {parseBlock({
//               width: item.width,
//               rows: item.rows
//             })}
//           </Grid>
//         );
//       }
//       console.log(parsedRow);

//       rowElements.push(
//         <Grid container item direction="row">
//           {parsedRow}
//         </Grid>
//       );
//     } else {
//       rowElements.push(<Grid item>{React.createElement(row)}</Grid>);
//     }

//     parsedRows.push(
//       <Grid container item>
//         {rowElements}
//       </Grid>
//     );
//   }

//   return parsedRows;
// };

// ReactTemplateLayout.propTypes = {
//   layout: PropTypes.arrayOf(PropTypes.object).isRequired
// };

export default () => {};
