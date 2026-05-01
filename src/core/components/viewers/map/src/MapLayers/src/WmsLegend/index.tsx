"use client"

// import * as React from 'react';
// import { ListItemText } from '@mui/material';
// import { NestedList } from '@/src/app/components/Common/NestedList';
// import { IWms } from '@/src/app/types/datasetTypes';

// import MinimizeIcon from '@mui/icons-material/ExpandMore';
// import VisibleIcon from '@mui/icons-material/Visibility';
// import HiddenIcon from '@mui/icons-material/VisibilityOff';
// import CloseIcon from '@mui/icons-material/Close';
// import { DatasetContext } from '@/src/app/store';

// interface NestedObject {
//   [key: string]: NestedObject | string;
// }

// export default function WmsLegend() {
//   const { dispatch: datasetDispatch, state: datasetState } =
//     React.useContext(DatasetContext);

//   const { addedLayers } = datasetState.dataset;
//   const [hidden, setHidden] = React.useState<string[]>([]);
//   const [open, setOpen] = React.useState('');

//   const handleClose = (wms: IWms) => {
//     datasetDispatch({
//       type: 'REMOVE_WMS_LAYER',
//       payload: { wms },
//     });
//   };

//   const handleOpen = (title: string) => {
//     if (title === open) setOpen('');
//     else setOpen(title);
//   };

//   const handleVisibility = (title: string) => {
//     if (hidden.includes(title))
//       setHidden(hidden.filter((layer) => layer !== title));
//     else setHidden([...hidden, title]);
//   };

//   const renderNestedList = (
//     data: NestedObject | string[] | NestedObject[],
//     listType?: 'parent' | 'table'
//   ): React.ReactNode => {
//     if (Array.isArray(data)) {
//       if (typeof data[0] === 'string') {
//         // Array of strings
//         return data.map((item) => <ListItemText key={item} primary={item} />);
//       }
//       // Array of objects
//       return data.map((item, index) => renderNestedList(item, 'table'));
//     }
//     if (typeof data === 'object' && data !== null) {
//       // Object
//       return Object.keys(data).map((key) => {
//         const value = data[key];
//         const isObject = typeof value === 'object' && value !== null;
//         return (
//           <NestedList key={key} title={key} listType={listType}>
//             {isObject ? (
//               renderNestedList(value, 'table')
//             ) : (
//               <ListItemText key={key} primary={value as string} />
//             )}
//           </NestedList>
//         );
//       });
//     }
//     if (typeof data === 'string') {
//       // String
//       return <ListItemText primary={data} />;
//     }
//     // Rest of the data types

//     return <ListItemText primary={`${data}`} />;
//   };

//   return (
//     <div className="flex-col gap-[4px] px-2 mt-4">
//       {addedLayers.map((wms, index) => {
//         const { wmsCapabilities } = wms;
//         const service = wmsCapabilities.Service[0];
//         const capability = wmsCapabilities.Capability[0];
//         const layer = capability.Layer[0];
//         const title = service.Title[0];

//         const wmsLayer = {
//           ...layer,
//           ...service,
//           ...wmsCapabilities,
//           ...capability,
//         };
//         return (
//           <div
//             key={index}
//           >
//             <div className="m-1 flex max-w-full cursor-pointer flex-row place-items-center justify-between">
//               <h4 className="mx-2 line-clamp-1 text-left">{title}</h4>
//               <div className="flex flex-row gap-1 pb-2">
//                 <div onClick={() => handleVisibility(title)}>
//                   {hidden.includes(title) ? <HiddenIcon /> : <VisibleIcon />}
//                 </div>
//                 <div onClick={() => handleOpen(title)}>
//                   {wms.title === open ? (
//                     <MinimizeIcon />
//                   ) : (
//                     <MinimizeIcon sx={{ rotate: '180deg' }} />
//                   )}
//                 </div>
//                 <div onClick={() => handleClose(wms)}>
//                   <CloseIcon />
//                 </div>
//               </div>
//             </div>

//             {wms.title === open && (
//               <div className=" max-h-[300px] max-w-full overflow-auto">
//                 {renderNestedList(wmsLayer, 'parent')}
//               </div>
//             )}
//           </div>
//         );
//       })}
//     </div>
//   );
// }
