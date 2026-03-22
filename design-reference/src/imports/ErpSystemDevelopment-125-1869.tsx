import svgPaths from "./svg-04uwcp4abv";

function Heading() {
  return (
    <div className="h-[36px] relative shrink-0 w-full" data-name="Heading 1">
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[36px] left-0 not-italic text-[#0a0a0a] text-[30px] top-[-2px]">Operations</p>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[24px] left-0 not-italic text-[#4a5565] text-[16px] top-[-2px]">{`Warehouse operations: Print, Pick, Pack, Ship & Receive Returns`}</p>
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] h-[64px] items-start relative shrink-0 w-full" data-name="Container">
      <Heading />
      <Paragraph />
    </div>
  );
}

function Icon() {
  return (
    <div className="absolute left-0 size-[16px] top-[2px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p19416e00} id="Vector" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p3e059a80} id="Vector_2" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M6.66667 6H5.33333" id="Vector_3" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M10.6667 8.66667H5.33333" id="Vector_4" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M10.6667 11.3333H5.33333" id="Vector_5" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Heading2() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <Icon />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[24px] not-italic text-[#4a5565] text-[14px] top-[-1px]">Not Printed</p>
    </div>
  );
}

function Container3() {
  return (
    <div className="h-[62px] relative shrink-0 w-[293.5px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,20fr)_minmax(0,1fr)] pb-[18px] pt-[24px] px-[24px] relative size-full">
        <Heading2 />
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex h-[32px] items-start relative shrink-0 w-full" data-name="Container">
      <p className="flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[32px] min-h-px min-w-px not-italic relative text-[#e7000b] text-[24px] whitespace-pre-wrap">1</p>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#4a5565] text-[12px] whitespace-pre-wrap">Need invoice printing</p>
    </div>
  );
}

function Container4() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[293.5px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start px-[24px] relative size-full">
        <Container5 />
        <Paragraph1 />
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="bg-white col-1 content-stretch flex flex-col gap-[24px] items-start justify-self-stretch p-px relative rounded-[14px] row-1 self-stretch shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container3 />
      <Container4 />
    </div>
  );
}

function Icon1() {
  return (
    <div className="absolute left-0 size-[16px] top-[2px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p18993c00} id="Vector" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M8 14.6667V8" id="Vector_2" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p14df0fc0} id="Vector_3" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M5 2.84667L11 6.28" id="Vector_4" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Heading3() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <Icon1 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[24px] not-italic text-[#4a5565] text-[14px] top-[-1px]">Printed</p>
    </div>
  );
}

function Container7() {
  return (
    <div className="h-[62px] relative shrink-0 w-[293.5px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,20fr)_minmax(0,1fr)] pb-[18px] pt-[24px] px-[24px] relative size-full">
        <Heading3 />
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex h-[32px] items-start relative shrink-0 w-full" data-name="Container">
      <p className="flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[32px] min-h-px min-w-px not-italic relative text-[#155dfc] text-[24px] whitespace-pre-wrap">1</p>
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#4a5565] text-[12px] whitespace-pre-wrap">{`Ready to pick & pack`}</p>
    </div>
  );
}

function Container8() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[293.5px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start px-[24px] relative size-full">
        <Container9 />
        <Paragraph2 />
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="bg-white col-2 content-stretch flex flex-col gap-[24px] items-start justify-self-stretch p-px relative rounded-[14px] row-1 self-stretch shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container7 />
      <Container8 />
    </div>
  );
}

function Icon2() {
  return (
    <div className="absolute left-0 size-[16px] top-[2px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p299d1200} id="Vector" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p1f2c5400} id="Vector_2" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Heading4() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <Icon2 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[24px] not-italic text-[#4a5565] text-[14px] top-[-1px]">Packed</p>
    </div>
  );
}

function Container11() {
  return (
    <div className="h-[62px] relative shrink-0 w-[293.5px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,20fr)_minmax(0,1fr)] pb-[18px] pt-[24px] px-[24px] relative size-full">
        <Heading4 />
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex h-[32px] items-start relative shrink-0 w-full" data-name="Container">
      <p className="flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[32px] min-h-px min-w-px not-italic relative text-[#00a63e] text-[24px] whitespace-pre-wrap">1</p>
    </div>
  );
}

function Paragraph3() {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#4a5565] text-[12px] whitespace-pre-wrap">Ready to ship</p>
    </div>
  );
}

function Container12() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[293.5px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start px-[24px] relative size-full">
        <Container13 />
        <Paragraph3 />
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="bg-white col-3 content-stretch flex flex-col gap-[24px] items-start justify-self-stretch p-px relative rounded-[14px] row-1 self-stretch shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container11 />
      <Container12 />
    </div>
  );
}

function Icon3() {
  return (
    <div className="absolute left-0 size-[16px] top-[2px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p264a0480} id="Vector" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M10 12H6" id="Vector_2" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p37bb0d00} id="Vector_3" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p1c171d80} id="Vector_4" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p48c6d00} id="Vector_5" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Heading5() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <Icon3 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[24px] not-italic text-[#4a5565] text-[14px] top-[-1px]">Send to Lab</p>
    </div>
  );
}

function Container15() {
  return (
    <div className="h-[62px] relative shrink-0 w-[293.5px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,20fr)_minmax(0,1fr)] pb-[18px] pt-[24px] px-[24px] relative size-full">
        <Heading5 />
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex h-[32px] items-start relative shrink-0 w-full" data-name="Container">
      <p className="flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[32px] min-h-px min-w-px not-italic relative text-[#9810fa] text-[24px] whitespace-pre-wrap">1</p>
    </div>
  );
}

function Paragraph4() {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#4a5565] text-[12px] whitespace-pre-wrap">Custom prescriptions</p>
    </div>
  );
}

function Container16() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[293.5px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start px-[24px] relative size-full">
        <Container17 />
        <Paragraph4 />
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="bg-white col-4 content-stretch flex flex-col gap-[24px] items-start justify-self-stretch p-px relative rounded-[14px] row-1 self-stretch shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container15 />
      <Container16 />
    </div>
  );
}

function Container1() {
  return (
    <div className="gap-x-[16px] gap-y-[16px] grid grid-cols-[repeat(4,minmax(0,1fr))] grid-rows-[repeat(1,minmax(0,1fr))] h-[164px] relative shrink-0 w-full" data-name="Container">
      <Container2 />
      <Container6 />
      <Container10 />
      <Container14 />
    </div>
  );
}

function Icon4() {
  return (
    <div className="absolute left-0 size-[20px] top-0" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p3713e00} id="Vector" stroke="var(--stroke-0, #E7000B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.pd2076c0} id="Vector_2" stroke="var(--stroke-0, #E7000B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M8.33333 7.5H6.66667" id="Vector_3" stroke="var(--stroke-0, #E7000B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M13.3333 10.8333H6.66667" id="Vector_4" stroke="var(--stroke-0, #E7000B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M13.3333 14.1667H6.66667" id="Vector_5" stroke="var(--stroke-0, #E7000B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Heading6() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <Icon4 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[16px] left-[28px] not-italic text-[#0a0a0a] text-[16px] top-0">Orders Awaiting Invoice Print</p>
    </div>
  );
}

function Container19() {
  return (
    <div className="absolute gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,20fr)_minmax(0,1fr)] h-[50px] left-px pb-[6px] pt-[24px] px-[24px] top-px w-[1228px]" data-name="Container">
      <Heading6 />
    </div>
  );
}

function HeaderCell() {
  return (
    <div className="absolute h-[40px] left-0 top-0 w-[150.281px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Order ID</p>
    </div>
  );
}

function HeaderCell1() {
  return (
    <div className="absolute h-[40px] left-[150.28px] top-0 w-[244.313px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Customer</p>
    </div>
  );
}

function HeaderCell2() {
  return (
    <div className="absolute h-[40px] left-[394.59px] top-0 w-[129.375px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Items</p>
    </div>
  );
}

function HeaderCell3() {
  return (
    <div className="absolute h-[40px] left-[523.97px] top-0 w-[119.141px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Total</p>
    </div>
  );
}

function HeaderCell4() {
  return (
    <div className="absolute h-[40px] left-[643.11px] top-0 w-[282.984px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Address</p>
    </div>
  );
}

function HeaderCell5() {
  return (
    <div className="absolute h-[40px] left-[926.09px] top-0 w-[253.906px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Actions</p>
    </div>
  );
}

function TableRow() {
  return (
    <div className="absolute border-[rgba(0,0,0,0.1)] border-b border-solid h-[40px] left-0 top-0 w-[1180px]" data-name="Table Row">
      <HeaderCell />
      <HeaderCell1 />
      <HeaderCell2 />
      <HeaderCell3 />
      <HeaderCell4 />
      <HeaderCell5 />
    </div>
  );
}

function TableHeader() {
  return (
    <div className="absolute h-[40px] left-0 top-0 w-[1180px]" data-name="Table Header">
      <TableRow />
    </div>
  );
}

function TableCell() {
  return (
    <div className="absolute h-[52.5px] left-0 top-0 w-[150.281px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[15.5px]">#10157</p>
    </div>
  );
}

function Paragraph5() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">Ahmed Hassan</p>
    </div>
  );
}

function Paragraph6() {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#4a5565] text-[12px] whitespace-pre-wrap">+880 1711 123456</p>
    </div>
  );
}

function Container20() {
  return (
    <div className="absolute content-stretch flex flex-col h-[36px] items-start left-[8px] top-[8.5px] w-[228.313px]" data-name="Container">
      <Paragraph5 />
      <Paragraph6 />
    </div>
  );
}

function TableCell1() {
  return (
    <div className="absolute h-[52.5px] left-[150.28px] top-0 w-[244.313px]" data-name="Table Cell">
      <Container20 />
    </div>
  );
}

function TableCell2() {
  return (
    <div className="absolute h-[52.5px] left-[394.59px] top-0 w-[129.375px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[15.5px]">1 items</p>
    </div>
  );
}

function TableCell3() {
  return (
    <div className="absolute h-[52.5px] left-[523.97px] top-0 w-[119.141px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium','Noto_Sans_Bengali:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[15.5px]">৳90.00</p>
    </div>
  );
}

function TableCell4() {
  return (
    <div className="absolute h-[52.5px] left-[643.11px] top-0 w-[282.984px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[8px] not-italic text-[#4a5565] text-[14px] top-[15.5px]">Dhaka, Bangladesh</p>
    </div>
  );
}

function Link() {
  return (
    <div className="bg-[#030213] h-[32px] relative rounded-[8px] shrink-0 w-[103.391px]" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center px-[12px] relative size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[14px] text-white">Print Invoice</p>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="absolute content-stretch flex h-[32px] items-start left-[8px] top-[10.5px] w-[237.906px]" data-name="Container">
      <Link />
    </div>
  );
}

function TableCell5() {
  return (
    <div className="absolute h-[52.5px] left-[926.09px] top-0 w-[253.906px]" data-name="Table Cell">
      <Container21 />
    </div>
  );
}

function TableRow1() {
  return (
    <div className="absolute h-[52.5px] left-0 top-0 w-[1180px]" data-name="Table Row">
      <TableCell />
      <TableCell1 />
      <TableCell2 />
      <TableCell3 />
      <TableCell4 />
      <TableCell5 />
    </div>
  );
}

function TableBody() {
  return (
    <div className="absolute h-[52.5px] left-0 top-[40px] w-[1180px]" data-name="Table Body">
      <TableRow1 />
    </div>
  );
}

function Table() {
  return (
    <div className="absolute h-[92.5px] left-[25px] overflow-clip top-[75px] w-[1180px]" data-name="Table">
      <TableHeader />
      <TableBody />
    </div>
  );
}

function Container18() {
  return (
    <div className="bg-white h-[192.5px] relative rounded-[14px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container19 />
      <Table />
    </div>
  );
}

function Icon5() {
  return (
    <div className="absolute left-0 size-[20px] top-0" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p20f4ecf0} id="Vector" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M10 18.3333V10" id="Vector_2" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p2eca8c80} id="Vector_3" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M6.25 3.55833L13.75 7.85" id="Vector_4" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Heading7() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <Icon5 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[16px] left-[28px] not-italic text-[#0a0a0a] text-[16px] top-0">{`Printed Orders - Ready to Pick & Pack`}</p>
    </div>
  );
}

function Container23() {
  return (
    <div className="absolute gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,20fr)_minmax(0,1fr)] h-[50px] left-px pb-[6px] pt-[24px] px-[24px] top-px w-[1228px]" data-name="Container">
      <Heading7 />
    </div>
  );
}

function HeaderCell6() {
  return (
    <div className="absolute h-[40px] left-0 top-0 w-[155.609px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Order ID</p>
    </div>
  );
}

function HeaderCell7() {
  return (
    <div className="absolute h-[40px] left-[155.61px] top-0 w-[252.984px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Customer</p>
    </div>
  );
}

function HeaderCell8() {
  return (
    <div className="absolute h-[40px] left-[408.59px] top-0 w-[523.609px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Items</p>
    </div>
  );
}

function HeaderCell9() {
  return (
    <div className="absolute h-[40px] left-[932.2px] top-0 w-[247.797px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Actions</p>
    </div>
  );
}

function TableRow2() {
  return (
    <div className="absolute border-[rgba(0,0,0,0.1)] border-b border-solid h-[40px] left-0 top-0 w-[1180px]" data-name="Table Row">
      <HeaderCell6 />
      <HeaderCell7 />
      <HeaderCell8 />
      <HeaderCell9 />
    </div>
  );
}

function TableHeader1() {
  return (
    <div className="absolute h-[40px] left-0 top-0 w-[1180px]" data-name="Table Header">
      <TableRow2 />
    </div>
  );
}

function TableCell6() {
  return (
    <div className="absolute h-[60.5px] left-0 top-0 w-[155.609px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[19.5px]">#10165</p>
    </div>
  );
}

function Paragraph7() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">Rashid Ali</p>
    </div>
  );
}

function Paragraph8() {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#4a5565] text-[12px] whitespace-pre-wrap">+880 1719 901234</p>
    </div>
  );
}

function Container24() {
  return (
    <div className="absolute content-stretch flex flex-col h-[36px] items-start left-[8px] top-[12.5px] w-[236.984px]" data-name="Container">
      <Paragraph7 />
      <Paragraph8 />
    </div>
  );
}

function TableCell7() {
  return (
    <div className="absolute h-[60.5px] left-[155.61px] top-0 w-[252.984px]" data-name="Table Cell">
      <Container24 />
    </div>
  );
}

function Container26() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Container">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[0] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[0px] text-[14px] whitespace-pre-wrap">
        <span className="leading-[20px]">2x</span>
        <span className="font-['Inter:Regular',sans-serif] font-normal leading-[20px]">{` Blue Light Glasses - Black - Large`}</span>
      </p>
    </div>
  );
}

function Container27() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Container">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[0] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[0px] text-[14px] whitespace-pre-wrap">
        <span className="leading-[20px]">1x</span>
        <span className="font-['Inter:Regular',sans-serif] font-normal leading-[20px]">{` Contact Lens Case - Blue`}</span>
      </p>
    </div>
  );
}

function Container25() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[44px] items-start left-[8px] top-[8.5px] w-[507.609px]" data-name="Container">
      <Container26 />
      <Container27 />
    </div>
  );
}

function TableCell8() {
  return (
    <div className="absolute h-[60.5px] left-[408.59px] top-0 w-[523.609px]" data-name="Table Cell">
      <Container25 />
    </div>
  );
}

function Link1() {
  return (
    <div className="bg-[#030213] h-[32px] relative rounded-[8px] shrink-0 w-[96.516px]" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center px-[12px] relative size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[14px] text-white">{`Pick & Pack`}</p>
      </div>
    </div>
  );
}

function Container28() {
  return (
    <div className="absolute content-stretch flex h-[32px] items-start left-[8px] top-[14.5px] w-[231.797px]" data-name="Container">
      <Link1 />
    </div>
  );
}

function TableCell9() {
  return (
    <div className="absolute h-[60.5px] left-[932.2px] top-0 w-[247.797px]" data-name="Table Cell">
      <Container28 />
    </div>
  );
}

function TableRow3() {
  return (
    <div className="absolute h-[60.5px] left-0 top-0 w-[1180px]" data-name="Table Row">
      <TableCell6 />
      <TableCell7 />
      <TableCell8 />
      <TableCell9 />
    </div>
  );
}

function TableBody1() {
  return (
    <div className="absolute h-[60.5px] left-0 top-[40px] w-[1180px]" data-name="Table Body">
      <TableRow3 />
    </div>
  );
}

function Table1() {
  return (
    <div className="absolute h-[100.5px] left-[25px] overflow-clip top-[75px] w-[1180px]" data-name="Table">
      <TableHeader1 />
      <TableBody1 />
    </div>
  );
}

function Container22() {
  return (
    <div className="bg-white h-[200.5px] relative rounded-[14px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container23 />
      <Table1 />
    </div>
  );
}

function Icon6() {
  return (
    <div className="absolute left-0 size-[20px] top-0" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p33ed6f00} id="Vector" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M12.5 15H7.5" id="Vector_2" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p2f5b2980} id="Vector_3" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p76e7200} id="Vector_4" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.pce04cf0} id="Vector_5" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Heading8() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <Icon6 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[16px] left-[28px] not-italic text-[#0a0a0a] text-[16px] top-0">Packed Orders - Ready to Ship</p>
    </div>
  );
}

function Container30() {
  return (
    <div className="absolute gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,20fr)_minmax(0,1fr)] h-[50px] left-px pb-[6px] pt-[24px] px-[24px] top-px w-[1228px]" data-name="Container">
      <Heading8 />
    </div>
  );
}

function HeaderCell10() {
  return (
    <div className="absolute h-[40px] left-0 top-0 w-[155.594px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Order ID</p>
    </div>
  );
}

function HeaderCell11() {
  return (
    <div className="absolute h-[40px] left-[155.59px] top-0 w-[252.953px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Customer</p>
    </div>
  );
}

function HeaderCell12() {
  return (
    <div className="absolute h-[40px] left-[408.55px] top-0 w-[293px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Address</p>
    </div>
  );
}

function HeaderCell13() {
  return (
    <div className="absolute h-[40px] left-[701.55px] top-0 w-[156.938px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Payment</p>
    </div>
  );
}

function HeaderCell14() {
  return (
    <div className="absolute h-[40px] left-[858.48px] top-0 w-[321.516px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Actions</p>
    </div>
  );
}

function TableRow4() {
  return (
    <div className="absolute border-[rgba(0,0,0,0.1)] border-b border-solid h-[40px] left-0 top-0 w-[1180px]" data-name="Table Row">
      <HeaderCell10 />
      <HeaderCell11 />
      <HeaderCell12 />
      <HeaderCell13 />
      <HeaderCell14 />
    </div>
  );
}

function TableHeader2() {
  return (
    <div className="absolute h-[40px] left-0 top-0 w-[1180px]" data-name="Table Header">
      <TableRow4 />
    </div>
  );
}

function TableCell10() {
  return (
    <div className="absolute h-[52.5px] left-0 top-0 w-[155.594px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[15.5px]">#10166</p>
    </div>
  );
}

function Paragraph9() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">Amina Rahman</p>
    </div>
  );
}

function Paragraph10() {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#4a5565] text-[12px] whitespace-pre-wrap">+880 1720 012345</p>
    </div>
  );
}

function Container31() {
  return (
    <div className="absolute content-stretch flex flex-col h-[36px] items-start left-[8px] top-[8.5px] w-[236.953px]" data-name="Container">
      <Paragraph9 />
      <Paragraph10 />
    </div>
  );
}

function TableCell11() {
  return (
    <div className="absolute h-[52.5px] left-[155.59px] top-0 w-[252.953px]" data-name="Table Cell">
      <Container31 />
    </div>
  );
}

function TableCell12() {
  return (
    <div className="absolute h-[52.5px] left-[408.55px] top-0 w-[293px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[15.5px]">Dhaka, Bangladesh</p>
    </div>
  );
}

function Text() {
  return (
    <div className="absolute bg-[#030213] h-[22px] left-[8px] rounded-[8px] top-[15.5px] w-[42.984px]" data-name="Text">
      <div className="content-stretch flex items-center justify-center overflow-clip px-[9px] py-[3px] relative rounded-[inherit] size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[12px] text-white">COD</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function TableCell13() {
  return (
    <div className="absolute h-[52.5px] left-[701.55px] top-0 w-[156.938px]" data-name="Table Cell">
      <Text />
    </div>
  );
}

function Link2() {
  return (
    <div className="bg-[#030213] h-[32px] relative rounded-[8px] shrink-0 w-[130px]" data-name="Link">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center px-[12px] relative size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[14px] text-white">Mark as Shipped</p>
      </div>
    </div>
  );
}

function Container32() {
  return (
    <div className="absolute content-stretch flex h-[32px] items-start left-[8px] top-[10.5px] w-[305.516px]" data-name="Container">
      <Link2 />
    </div>
  );
}

function TableCell14() {
  return (
    <div className="absolute h-[52.5px] left-[858.48px] top-0 w-[321.516px]" data-name="Table Cell">
      <Container32 />
    </div>
  );
}

function TableRow5() {
  return (
    <div className="absolute h-[52.5px] left-0 top-0 w-[1180px]" data-name="Table Row">
      <TableCell10 />
      <TableCell11 />
      <TableCell12 />
      <TableCell13 />
      <TableCell14 />
    </div>
  );
}

function TableBody2() {
  return (
    <div className="absolute h-[52.5px] left-0 top-[40px] w-[1180px]" data-name="Table Body">
      <TableRow5 />
    </div>
  );
}

function Table2() {
  return (
    <div className="absolute h-[92.5px] left-[25px] overflow-clip top-[75px] w-[1180px]" data-name="Table">
      <TableHeader2 />
      <TableBody2 />
    </div>
  );
}

function Container29() {
  return (
    <div className="bg-white h-[192.5px] relative rounded-[14px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container30 />
      <Table2 />
    </div>
  );
}

function Icon7() {
  return (
    <div className="absolute left-0 size-[20px] top-0" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p20f4ecf0} id="Vector" stroke="var(--stroke-0, #9810FA)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M10 18.3333V10" id="Vector_2" stroke="var(--stroke-0, #9810FA)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p2eca8c80} id="Vector_3" stroke="var(--stroke-0, #9810FA)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M6.25 3.55833L13.75 7.85" id="Vector_4" stroke="var(--stroke-0, #9810FA)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Heading9() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <Icon7 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[16px] left-[28px] not-italic text-[#0a0a0a] text-[16px] top-0">Orders to Send to Lab</p>
    </div>
  );
}

function Container34() {
  return (
    <div className="absolute gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,20fr)_minmax(0,1fr)] h-[50px] left-px pb-[6px] pt-[24px] px-[24px] top-px w-[1228px]" data-name="Container">
      <Heading9 />
    </div>
  );
}

function HeaderCell15() {
  return (
    <div className="absolute h-[40px] left-0 top-0 w-[110.313px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Order ID</p>
    </div>
  );
}

function HeaderCell16() {
  return (
    <div className="absolute h-[40px] left-[110.31px] top-0 w-[179.344px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Customer</p>
    </div>
  );
}

function HeaderCell17() {
  return (
    <div className="absolute h-[40px] left-[289.66px] top-0 w-[338.438px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Items</p>
    </div>
  );
}

function HeaderCell18() {
  return (
    <div className="absolute h-[40px] left-[628.09px] top-0 w-[373.25px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Notes</p>
    </div>
  );
}

function HeaderCell19() {
  return (
    <div className="absolute h-[40px] left-[1001.34px] top-0 w-[178.656px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Actions</p>
    </div>
  );
}

function TableRow6() {
  return (
    <div className="absolute border-[rgba(0,0,0,0.1)] border-b border-solid h-[40px] left-0 top-0 w-[1180px]" data-name="Table Row">
      <HeaderCell15 />
      <HeaderCell16 />
      <HeaderCell17 />
      <HeaderCell18 />
      <HeaderCell19 />
    </div>
  );
}

function TableHeader3() {
  return (
    <div className="absolute h-[40px] left-0 top-0 w-[1180px]" data-name="Table Header">
      <TableRow6 />
    </div>
  );
}

function TableCell15() {
  return (
    <div className="absolute h-[52.5px] left-0 top-0 w-[110.313px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[15.5px]">#10163</p>
    </div>
  );
}

function Paragraph11() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">Tariq Ahmed</p>
    </div>
  );
}

function Paragraph12() {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#4a5565] text-[12px] whitespace-pre-wrap">+880 1717 789012</p>
    </div>
  );
}

function Container35() {
  return (
    <div className="absolute content-stretch flex flex-col h-[36px] items-start left-[8px] top-[8.5px] w-[163.344px]" data-name="Container">
      <Paragraph11 />
      <Paragraph12 />
    </div>
  );
}

function TableCell16() {
  return (
    <div className="absolute h-[52.5px] left-[110.31px] top-0 w-[179.344px]" data-name="Table Cell">
      <Container35 />
    </div>
  );
}

function Container36() {
  return (
    <div className="absolute content-stretch flex h-[20px] items-start left-[8px] top-[16.5px] w-[322.438px]" data-name="Container">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">1x Reading Glasses - Gold - +1.5</p>
    </div>
  );
}

function TableCell17() {
  return (
    <div className="absolute h-[52.5px] left-[289.66px] top-0 w-[338.438px]" data-name="Table Cell">
      <Container36 />
    </div>
  );
}

function TableCell18() {
  return (
    <div className="absolute h-[52.5px] left-[628.09px] top-0 w-[373.25px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[8px] not-italic text-[#4a5565] text-[14px] top-[15.5px]">Pick and send to lab for prescription</p>
    </div>
  );
}

function Link3() {
  return (
    <div className="absolute bg-[#030213] h-[32px] left-[8px] rounded-[8px] top-[10.5px] w-[98.438px]" data-name="Link">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[12px] not-italic text-[14px] text-white top-[5px]">Pick for Lab</p>
    </div>
  );
}

function TableCell19() {
  return (
    <div className="absolute h-[52.5px] left-[1001.34px] top-0 w-[178.656px]" data-name="Table Cell">
      <Link3 />
    </div>
  );
}

function TableRow7() {
  return (
    <div className="absolute h-[52.5px] left-0 top-0 w-[1180px]" data-name="Table Row">
      <TableCell15 />
      <TableCell16 />
      <TableCell17 />
      <TableCell18 />
      <TableCell19 />
    </div>
  );
}

function TableBody3() {
  return (
    <div className="absolute h-[52.5px] left-0 top-[40px] w-[1180px]" data-name="Table Body">
      <TableRow7 />
    </div>
  );
}

function Table3() {
  return (
    <div className="absolute h-[92.5px] left-[25px] overflow-clip top-[75px] w-[1180px]" data-name="Table">
      <TableHeader3 />
      <TableBody3 />
    </div>
  );
}

function Container33() {
  return (
    <div className="bg-white h-[192.5px] relative rounded-[14px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container34 />
      <Table3 />
    </div>
  );
}

function Heading10() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[16px] left-0 not-italic text-[#0a0a0a] text-[16px] top-[-2px]">Quick Access</p>
    </div>
  );
}

function Container38() {
  return (
    <div className="absolute gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,16fr)_minmax(0,1fr)] h-[46px] left-px pb-[6px] pt-[24px] px-[24px] top-px w-[1228px]" data-name="Container">
      <Heading10 />
    </div>
  );
}

function Icon8() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p12949080} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M2 2V5.33333H5.33333" id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Text1() {
  return (
    <div className="h-[20px] relative shrink-0 w-[100.141px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#0a0a0a] text-[14px]">Receive Returns</p>
      </div>
    </div>
  );
}

function Link4() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col gap-[8px] h-[96px] items-center justify-center left-0 p-px rounded-[8px] top-0 w-[382.656px]" data-name="Link">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <Icon8 />
      <Text1 />
    </div>
  );
}

function Icon9() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p18993c00} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M8 14.6667V8" id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p14df0fc0} id="Vector_3" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M5 2.84667L11 6.28" id="Vector_4" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Text2() {
  return (
    <div className="h-[20px] relative shrink-0 w-[118.719px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#0a0a0a] text-[14px]">Receive Shipments</p>
      </div>
    </div>
  );
}

function Link5() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col gap-[8px] h-[96px] items-center justify-center left-[398.66px] p-px rounded-[8px] top-0 w-[382.672px]" data-name="Link">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <Icon9 />
      <Text2 />
    </div>
  );
}

function Icon10() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p19416e00} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p3e059a80} id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M6.66667 6H5.33333" id="Vector_3" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M10.6667 8.66667H5.33333" id="Vector_4" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M10.6667 11.3333H5.33333" id="Vector_5" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Text3() {
  return (
    <div className="h-[20px] relative shrink-0 w-[63.391px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#0a0a0a] text-[14px]">All Orders</p>
      </div>
    </div>
  );
}

function Link6() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col gap-[8px] h-[96px] items-center justify-center left-[797.33px] p-px rounded-[8px] top-0 w-[382.656px]" data-name="Link">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <Icon10 />
      <Text3 />
    </div>
  );
}

function Container39() {
  return (
    <div className="absolute h-[96px] left-[25px] top-[71px] w-[1180px]" data-name="Container">
      <Link4 />
      <Link5 />
      <Link6 />
    </div>
  );
}

function Container37() {
  return (
    <div className="bg-[#f9fafb] h-[192px] relative rounded-[14px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container38 />
      <Container39 />
    </div>
  );
}

function MainContent() {
  return (
    <div className="absolute bg-[#f9fafb] content-stretch flex flex-col gap-[24px] h-[1342px] items-start left-[280px] top-[88px] w-[1230px]" data-name="Main Content">
      <Container />
      <Container1 />
      <Container18 />
      <Container22 />
      <Container29 />
      <Container33 />
      <Container37 />
    </div>
  );
}

function Section() {
  return <div className="absolute h-0 left-0 top-[1454px] w-[1534px]" data-name="Section" />;
}

function Ty() {
  return (
    <div className="absolute bg-white h-[944px] left-0 top-0 w-[1534px]" data-name="TY">
      <MainContent />
      <Section />
    </div>
  );
}

function Icon11() {
  return (
    <div className="absolute left-[12px] size-[20px] top-[8px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p1fc96a00} id="Vector" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p33089d00} id="Vector_2" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p49cfa80} id="Vector_3" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p1cfbf300} id="Vector_4" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Link7() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <Icon11 />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Dashboard</p>
    </div>
  );
}

function Icon12() {
  return (
    <div className="absolute left-[12px] size-[20px] top-[8px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_114_1532)" id="Icon">
          <path d={svgPaths.p32514c00} id="Vector" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p2734ea00} id="Vector_2" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p24a52d80} id="Vector_3" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
        <defs>
          <clipPath id="clip0_114_1532">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Container41() {
  return (
    <div className="absolute h-[36px] left-0 top-0 w-[223px]" data-name="Container">
      <Icon12 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Purchase</p>
    </div>
  );
}

function Text4() {
  return (
    <div className="h-[20px] relative shrink-0 w-[101.047px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Purchase Orders</p>
      </div>
    </div>
  );
}

function Link8() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[81.953px] relative size-full">
          <Text4 />
        </div>
      </div>
    </div>
  );
}

function Text5() {
  return (
    <div className="h-[20px] relative shrink-0 w-[62.281px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Create PO</p>
      </div>
    </div>
  );
}

function Link9() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[120.719px] relative size-full">
          <Text5 />
        </div>
      </div>
    </div>
  );
}

function Text6() {
  return (
    <div className="h-[20px] relative shrink-0 w-[56.734px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Suppliers</p>
      </div>
    </div>
  );
}

function Link10() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[126.266px] relative size-full">
          <Text6 />
        </div>
      </div>
    </div>
  );
}

function Container42() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[116px] items-start left-[28px] top-[40px] w-[195px]" data-name="Container">
      <Link8 />
      <Link9 />
      <Link10 />
    </div>
  );
}

function Container40() {
  return (
    <div className="h-[156px] relative shrink-0 w-full" data-name="Container">
      <Container41 />
      <Container42 />
    </div>
  );
}

function Icon13() {
  return (
    <div className="absolute left-[12px] size-[20px] top-[8px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p20f4ecf0} id="Vector" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M10 18.3333V10" id="Vector_2" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p2eca8c80} id="Vector_3" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M6.25 3.55833L13.75 7.85" id="Vector_4" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Container44() {
  return (
    <div className="absolute h-[36px] left-0 top-0 w-[223px]" data-name="Container">
      <Icon13 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Inventory</p>
    </div>
  );
}

function Text7() {
  return (
    <div className="h-[20px] relative shrink-0 w-[54.234px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Products</p>
      </div>
    </div>
  );
}

function Link11() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[128.766px] relative size-full">
          <Text7 />
        </div>
      </div>
    </div>
  );
}

function Text8() {
  return (
    <div className="h-[20px] relative shrink-0 w-[64.969px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Shipments</p>
      </div>
    </div>
  );
}

function Link12() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[118.031px] relative size-full">
          <Text8 />
        </div>
      </div>
    </div>
  );
}

function Text9() {
  return (
    <div className="h-[20px] relative shrink-0 w-[109.984px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Stock Movements</p>
      </div>
    </div>
  );
}

function Link13() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[73.016px] relative size-full">
          <Text9 />
        </div>
      </div>
    </div>
  );
}

function Text10() {
  return (
    <div className="h-[20px] relative shrink-0 w-[69.156px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Warehouse</p>
      </div>
    </div>
  );
}

function Link14() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[113.844px] relative size-full">
          <Text10 />
        </div>
      </div>
    </div>
  );
}

function Text11() {
  return (
    <div className="h-[20px] relative shrink-0 w-[33.344px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Audit</p>
      </div>
    </div>
  );
}

function Link15() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[149.656px] relative size-full">
          <Text11 />
        </div>
      </div>
    </div>
  );
}

function Text12() {
  return (
    <div className="h-[20px] relative shrink-0 w-[46.5px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Receive</p>
      </div>
    </div>
  );
}

function Text13() {
  return (
    <div className="bg-[#fb2c36] relative rounded-[8px] shrink-0 size-[20px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center overflow-clip p-px relative rounded-[inherit] size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[12px] text-white">2</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Link16() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[12px] relative size-full">
          <Text12 />
          <Text13 />
        </div>
      </div>
    </div>
  );
}

function Container45() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[236px] items-start left-[28px] top-[40px] w-[195px]" data-name="Container">
      <Link11 />
      <Link12 />
      <Link13 />
      <Link14 />
      <Link15 />
      <Link16 />
    </div>
  );
}

function Container43() {
  return (
    <div className="h-[276px] relative shrink-0 w-full" data-name="Container">
      <Container44 />
      <Container45 />
    </div>
  );
}

function Icon14() {
  return (
    <div className="absolute left-[12px] size-[20px] top-[8px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p31104300} id="Vector" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p1b3f8200} id="Vector_2" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M10 9.16667H13.3333" id="Vector_3" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M10 13.3333H13.3333" id="Vector_4" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M6.66667 9.16667H6.675" id="Vector_5" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M6.66667 13.3333H6.675" id="Vector_6" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Container47() {
  return (
    <div className="absolute h-[36px] left-0 top-0 w-[223px]" data-name="Container">
      <Icon14 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Fulfilment</p>
    </div>
  );
}

function Text14() {
  return (
    <div className="h-[20px] relative shrink-0 w-[41.797px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Orders</p>
      </div>
    </div>
  );
}

function Link17() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[141.203px] relative size-full">
          <Text14 />
        </div>
      </div>
    </div>
  );
}

function Text15() {
  return (
    <div className="h-[20px] relative shrink-0 w-[70.234px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#1447e6] text-[14px]">Operations</p>
      </div>
    </div>
  );
}

function Link18() {
  return (
    <div className="bg-[#eff6ff] h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[112.766px] relative size-full">
          <Text15 />
        </div>
      </div>
    </div>
  );
}

function Container48() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[76px] items-start left-[28px] top-[40px] w-[195px]" data-name="Container">
      <Link17 />
      <Link18 />
    </div>
  );
}

function Container46() {
  return (
    <div className="h-[116px] relative shrink-0 w-full" data-name="Container">
      <Container47 />
      <Container48 />
    </div>
  );
}

function Icon15() {
  return (
    <div className="absolute left-[12px] size-[20px] top-[8px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p2110f1c0} id="Vector" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M2.5 2.5V6.66667H6.66667" id="Vector_2" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Link19() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <Icon15 />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Returns</p>
    </div>
  );
}

function Icon16() {
  return (
    <div className="absolute left-[12px] size-[20px] top-[8px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d="M10 1.66667V18.3333" id="Vector" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p3055a600} id="Vector_2" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Container50() {
  return (
    <div className="absolute h-[36px] left-0 top-0 w-[223px]" data-name="Container">
      <Icon16 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Finance</p>
    </div>
  );
}

function Text16() {
  return (
    <div className="h-[20px] relative shrink-0 w-[56.188px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Expenses</p>
      </div>
    </div>
  );
}

function Link20() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[126.813px] relative size-full">
          <Text16 />
        </div>
      </div>
    </div>
  );
}

function Text17() {
  return (
    <div className="h-[20px] relative shrink-0 w-[86.781px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Profit Analysis</p>
      </div>
    </div>
  );
}

function Link21() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[96.219px] relative size-full">
          <Text17 />
        </div>
      </div>
    </div>
  );
}

function Container51() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[76px] items-start left-[28px] top-[40px] w-[195px]" data-name="Container">
      <Link20 />
      <Link21 />
    </div>
  );
}

function Container49() {
  return (
    <div className="h-[116px] relative shrink-0 w-full" data-name="Container">
      <Container50 />
      <Container51 />
    </div>
  );
}

function Icon17() {
  return (
    <div className="absolute left-[12px] size-[20px] top-[8px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p140c1100} id="Vector" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M15 14.1667V7.5" id="Vector_2" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M10.8333 14.1667V4.16667" id="Vector_3" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M6.66667 14.1667V11.6667" id="Vector_4" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Link22() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <Icon17 />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Reports</p>
    </div>
  );
}

function Navigation() {
  return (
    <div className="h-[828px] relative shrink-0 w-full" data-name="Navigation">
      <div className="content-stretch flex flex-col gap-[4px] items-start pt-[16px] px-[16px] relative size-full">
        <Link7 />
        <Container40 />
        <Container43 />
        <Container46 />
        <Link19 />
        <Container49 />
        <Link22 />
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="absolute bg-white h-[880px] left-0 top-[64px] w-[256px]" data-name="Sidebar">
      <div className="content-stretch flex flex-col items-start overflow-clip pr-px relative rounded-[inherit] size-full">
        <Navigation />
      </div>
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-r border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Icon18() {
  return (
    <div className="h-[20px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute inset-1/4" data-name="Vector">
        <div className="absolute inset-[-8.33%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.6667 11.6667">
            <path d={svgPaths.p354ab980} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-1/4" data-name="Vector">
        <div className="absolute inset-[-8.33%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.6667 11.6667">
            <path d={svgPaths.p2a4db200} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="relative rounded-[10px] shrink-0 size-[36px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[8px] px-[8px] relative size-full">
        <Icon18 />
      </div>
    </div>
  );
}

function Heading1() {
  return (
    <div className="flex-[1_0_0] h-[28px] min-h-px min-w-px relative" data-name="Heading 1">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#0a0a0a] text-[20px]">ERP System</p>
      </div>
    </div>
  );
}

function Container53() {
  return (
    <div className="h-[36px] relative shrink-0 w-[156.641px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[16px] items-center relative size-full">
        <Button />
        <Heading1 />
      </div>
    </div>
  );
}

function Icon19() {
  return (
    <div className="absolute left-[13px] size-[16px] top-[10px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p399eca00} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.pc93b400} id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Text18() {
  return (
    <div className="absolute bg-[#fb2c36] h-[22px] left-[127.42px] rounded-[8px] top-[7px] w-[54.063px]" data-name="Text">
      <div className="content-stretch flex items-center justify-center overflow-clip px-[9px] py-[3px] relative rounded-[inherit] size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[12px] text-center text-white">Admin</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-white flex-[1_0_0] h-[36px] min-h-px min-w-px relative rounded-[8px]" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon19 />
        <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[74px] not-italic text-[#0a0a0a] text-[14px] text-center top-[7px]">Admin User</p>
        <Text18 />
      </div>
    </div>
  );
}

function Container54() {
  return (
    <div className="h-[36px] relative shrink-0 w-[194.484px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center relative size-full">
        <Button1 />
      </div>
    </div>
  );
}

function Container52() {
  return (
    <div className="h-[63px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[16px] relative size-full">
          <Container53 />
          <Container54 />
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col h-[64px] items-start left-0 pb-px top-0 w-[1534px]" data-name="Header">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <Container52 />
    </div>
  );
}

export default function ErpSystemDevelopment() {
  return (
    <div className="bg-white relative size-full" data-name="ERP System Development">
      <Ty />
      <Sidebar />
      <Header />
    </div>
  );
}