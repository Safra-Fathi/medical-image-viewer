import { useEffect, useRef, useCallback, useState } from 'react';
import type { ViewPlane, WindowLevel } from '../types';
import { extractSlice } from '../services/sliceExtractor';
import { useViewerStore } from '../store/viewerStore';
import { useAnalyticsStore } from '../store/analyticsStore';
import './Renderer2D.css';

interface Renderer2DProps {
  plane: ViewPlane;
  sliceIndex: number;
  label: string;
  interactive?: boolean;
}


function applyWindowLevel(value: number, wl: WindowLevel): number {
  const low = wl.center - wl.width / 2;
  const high = wl.center + wl.width / 2;

  if (high === low) return 0;

  const normalized = (value - low) / (high - low);

  return Math.min(Math.max(normalized, 0), 1) * 255;
}


export default function Renderer2D({
  plane,
  sliceIndex,
  label,
  interactive = true,
}: Renderer2DProps) {


  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dragState = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);


  const sliceCache = useRef<any>(null);


  const [hover, setHover] = useState<{
    x:number;
    y:number;
    value:number;
  } | null>(null);



  const imageFile = useViewerStore(
    (s)=>s.imageFile
  );

  const maskFile = useViewerStore(
    (s)=>s.maskFile
  );


  const maskVisible = useViewerStore(
    (s)=>s.maskVisible
  );

  const maskOpacity = useViewerStore(
    (s)=>s.maskOpacity
  );


  const zoom = useViewerStore(
    (s)=>s.zoom
  );

  const pan = useViewerStore(
    (s)=>s.pan
  );


  const setZoom = useViewerStore(
    (s)=>s.setZoom
  );

  const setPan = useViewerStore(
    (s)=>s.setPan
  );


  const setSlice = useViewerStore(
    (s)=>s.setSlice
  );


  const activePlane = useViewerStore(
    (s)=>s.activePlane
  );


  const setActivePlane = useViewerStore(
    (s)=>s.setActivePlane
  );


  const resetView = useViewerStore(
    (s)=>s.resetView
  );


  const recordZoom = useAnalyticsStore(
    (s)=>s.recordZoom
  );



  const render = useCallback(()=>{

    if(!imageFile) return;


    const canvas = canvasRef.current;

    if(!canvas) return;



    const slice =
      extractSlice(
        imageFile.volume,
        plane,
        sliceIndex
      );


    sliceCache.current = slice;



    canvas.width = slice.width;
    canvas.height = slice.height;


    const ctx =
      canvas.getContext('2d');


    if(!ctx) return;



    const img =
      ctx.createImageData(
        slice.width,
        slice.height
      );



    for(let i=0;i<slice.values.length;i++){

      const gray =
        applyWindowLevel(
          slice.values[i],
          imageFile.windowLevel
        );


      img.data[i*4] = gray;
      img.data[i*4+1] = gray;
      img.data[i*4+2] = gray;
      img.data[i*4+3] = 255;

    }



    // MASK OVERLAY

    if(maskFile && maskVisible){


      const maskSlice =
        extractSlice(
          maskFile.volume,
          plane,
          sliceIndex
        );


      for(
        let i=0;
        i<maskSlice.values.length;
        i++
      ){

        if(maskSlice.values[i] > 0){


          const a =
            maskOpacity;


          img.data[i*4] =
            img.data[i*4]*(1-a)
            +224*a;


          img.data[i*4+1] =
            img.data[i*4+1]*(1-a)
            +72*a;


          img.data[i*4+2] =
            img.data[i*4+2]*(1-a)
            +62*a;

        }

      }

    }



    ctx.putImageData(img,0,0);



  },[
    imageFile,
    maskFile,
    maskVisible,
    maskOpacity,
    plane,
    sliceIndex
  ]);



  useEffect(()=>{
    render();
  },[render]);




  // ZOOM + SLICE CONTROL

  const onWheel =
  useCallback(
  (e:React.WheelEvent)=>{


    if(!interactive) return;


    e.preventDefault();



    // SHIFT + WHEEL = SLICE

    if(e.shiftKey && imageFile){


      const direction =
        e.deltaY > 0 ? 1 : -1;


      const current =
        sliceIndex;


      const max =
        imageFile.volume.dims[
          plane==="axial"
          ? 2
          : plane==="sagittal"
          ? 0
          : 1
        ]-1;



      const next =
        Math.min(
          Math.max(
            current+direction,
            0
          ),
          max
        );


      setSlice(
        plane,
        next
      );


      return;

    }



    // NORMAL WHEEL = ZOOM


    const factor =
      e.deltaY > 0
      ? 0.9
      : 1.1;


    setZoom(
      zoom*factor
    );


    recordZoom();



  },
  [
    interactive,
    zoom,
    setZoom,
    recordZoom,
    imageFile,
    sliceIndex,
    plane,
    setSlice
  ]);





  const onMouseDown =
  useCallback(
  (e:React.MouseEvent)=>{


    if(!interactive) return;


    setActivePlane(plane);



    dragState.current={

      x:e.clientX,
      y:e.clientY,

      panX:pan.x,
      panY:pan.y

    };


  },
  [
    interactive,
    plane,
    pan,
    setActivePlane
  ]);





  const onMouseMove =
  useCallback(
  (e:React.MouseEvent)=>{


    if(dragState.current){


      const dx =
        e.clientX -
        dragState.current.x;


      const dy =
        e.clientY -
        dragState.current.y;



      setPan({

        x:
        dragState.current.panX+dx,

        y:
        dragState.current.panY+dy

      });



      return;

    }



    const canvas =
      canvasRef.current;


    const slice =
      sliceCache.current;


    if(!canvas || !slice)
      return;



    const rect =
      canvas.getBoundingClientRect();



    const x =
      Math.floor(
      ((e.clientX-rect.left)
      /rect.width)
      *
      canvas.width
      );



    const y =
      Math.floor(
      ((e.clientY-rect.top)
      /rect.height)
      *
      canvas.height
      );



    if(
      x>=0 &&
      y>=0 &&
      x<canvas.width &&
      y<canvas.height
    ){

      setHover({

        x,
        y,

        value:
        slice.values[
          y*canvas.width+x
        ]

      });

    }



  },
  [
    setPan
  ]);





  return (

<div
className={`renderer2d ${
activePlane===plane
?'renderer2d--active'
:''
}`}

onWheel={onWheel}
onMouseDown={onMouseDown}
onMouseMove={onMouseMove}

onMouseUp={()=>
dragState.current=null
}

onDoubleClick={()=>
resetView()
}

onMouseLeave={()=>{
dragState.current=null;
setHover(null);
}}

>


<div className="renderer2d__label">

<span>{label}</span>

{imageFile &&
<span>
slice {sliceIndex}
</span>
}

</div>



<div className="renderer2d__canvas-wrap">


{
imageFile ?

<canvas
ref={canvasRef}
style={{

transform:
`
translate(${pan.x}px,${pan.y}px)
scale(${zoom})
`

}}
/>

:

<div className="renderer2d__placeholder">

No image loaded

</div>

}


</div>



{
hover &&

<div className="renderer2d__readout">

({hover.x},{hover.y})
&nbsp;·&nbsp;
{hover.value.toFixed(1)}

</div>

}


</div>

  );

}