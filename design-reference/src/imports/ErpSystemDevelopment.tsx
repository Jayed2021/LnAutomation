import svgPaths from "./svg-wuipharyn4";

function Icon() {
  return (
    <div className="absolute left-[10px] size-[16px] top-[8px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p203476e0} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M12.6667 8H3.33333" id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="h-[32px] relative rounded-[8px] shrink-0 w-[79.703px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon />
        <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[55.5px] not-italic text-[#0a0a0a] text-[14px] text-center top-[5px]">Back</p>
      </div>
    </div>
  );
}

function Heading() {
  return (
    <div className="h-[28px] relative shrink-0 w-[60.859px]" data-name="Heading 1">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#0a0a0a] text-[20px]">#10157</p>
      </div>
    </div>
  );
}

function Text() {
  return (
    <div className="bg-[#dbeafe] h-[22px] relative rounded-[8px] shrink-0 w-[81.469px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center overflow-clip px-[9px] py-[3px] relative rounded-[inherit] size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#1447e6] text-[12px]">Not Printed</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex gap-[12px] h-[28px] items-center relative shrink-0 w-full" data-name="Container">
      <Heading />
      <Text />
    </div>
  );
}

function Paragraph() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#4a5565] text-[14px] whitespace-pre-wrap">2026-02-24</p>
    </div>
  );
}

function Container6() {
  return (
    <div className="h-[20px] relative shrink-0 w-[288.625px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[0] not-italic relative shrink-0 text-[#4a5565] text-[0px] text-[14px]">
          <span className="leading-[20px]">Items:</span>
          <span className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] text-[#0a0a0a]">Blue Light Glasses - Black - Medium (2)</span>
        </p>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex h-[20px] items-center relative shrink-0 w-full" data-name="Container">
      <Container6 />
    </div>
  );
}

function Container3() {
  return (
    <div className="flex-[1_0_0] h-[84px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start relative size-full">
        <Container4 />
        <Paragraph />
        <Container5 />
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="flex-[1_0_0] h-[84px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[16px] items-start relative size-full">
        <Button />
        <Container3 />
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="absolute left-[12px] size-[16px] top-[10px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_123_1001)" id="Icon">
          <path d={svgPaths.p2a44c680} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_123_1001">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#00a63e] h-[36px] relative rounded-[8px] shrink-0 w-[136.438px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon1 />
        <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[80.5px] not-italic text-[14px] text-center text-white top-[7px]">Call Customer</p>
      </div>
    </div>
  );
}

function Icon2() {
  return (
    <div className="absolute left-[23.73px] size-[16px] top-[10px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p38f39800} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p85cdd00} id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-white flex-[1_0_0] min-h-px min-w-px relative rounded-[8px] w-[136.438px]" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon2 />
        <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[79.73px] not-italic text-[#0a0a0a] text-[14px] text-center top-[7px]">Edit Order</p>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="h-[80px] relative shrink-0 w-[136.438px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[8px] items-start relative size-full">
        <Button1 />
        <Button2 />
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[1180px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between relative size-full">
        <Container2 />
        <Container7 />
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="bg-white h-[137px] relative rounded-[14px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#2b7fff] border-b-4 border-l border-r border-solid border-t inset-0 pointer-events-none rounded-[14px]" />
      <div className="content-stretch flex flex-col items-start pb-[28px] pl-[25px] pr-px pt-[25px] relative size-full">
        <Container1 />
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-0 not-italic text-[#0a0a0a] text-[16px] top-[-2px]">Customer Information</p>
    </div>
  );
}

function Container10() {
  return (
    <div className="h-[66px] relative shrink-0 w-[392px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,24fr)_minmax(0,1fr)] pb-[18px] pt-[24px] px-[24px] relative size-full">
        <Heading2 />
      </div>
    </div>
  );
}

function PrimitiveLabel() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Name</p>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">Ahmed Hassan</p>
    </div>
  );
}

function Container12() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] h-[40px] items-start relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel />
      <Paragraph1 />
    </div>
  );
}

function PrimitiveLabel1() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Phone</p>
    </div>
  );
}

function Icon3() {
  return (
    <div className="absolute left-0 size-[16px] top-[2px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_123_998)" id="Icon">
          <path d={svgPaths.p2a44c680} id="Vector" stroke="var(--stroke-0, #99A1AF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_123_998">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Paragraph">
      <Icon3 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[24px] not-italic text-[#0a0a0a] text-[14px] top-[-1px]">+880 1711 123456</p>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] h-[40px] items-start relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel1 />
      <Paragraph2 />
    </div>
  );
}

function PrimitiveLabel2() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">District</p>
    </div>
  );
}

function Paragraph3() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">Dhaka</p>
    </div>
  );
}

function Container14() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] h-[40px] items-start relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel2 />
      <Paragraph3 />
    </div>
  );
}

function PrimitiveLabel3() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Address</p>
    </div>
  );
}

function Icon4() {
  return (
    <div className="absolute left-0 size-[16px] top-[2px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p14548f00} id="Vector" stroke="var(--stroke-0, #99A1AF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p17781bc0} id="Vector_2" stroke="var(--stroke-0, #99A1AF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Paragraph4() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Paragraph">
      <Icon4 />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[24px] not-italic text-[#0a0a0a] text-[14px] top-[-1px]">Dhaka, Bangladesh</p>
    </div>
  );
}

function Container15() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] h-[40px] items-start relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel3 />
      <Paragraph4 />
    </div>
  );
}

function PrimitiveLabel4() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Email (Optional)</p>
    </div>
  );
}

function Paragraph5() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#6a7282] text-[14px] whitespace-pre-wrap">Not provided</p>
    </div>
  );
}

function Container16() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] h-[40px] items-start relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel4 />
      <Paragraph5 />
    </div>
  );
}

function PrimitiveLabel5() {
  return (
    <div className="absolute content-stretch flex h-[16px] items-center left-0 top-0 w-[344px]" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Payment Method</p>
    </div>
  );
}

function Icon5() {
  return (
    <div className="absolute left-[8px] size-[12px] top-[4px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g id="Icon">
          <path d={svgPaths.p1743f300} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M1 5H11" id="Vector_2" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Text1() {
  return (
    <div className="absolute bg-[#fff7ed] border border-[#ffd6a8] border-solid h-[22px] left-0 overflow-clip rounded-[8px] top-[21px] w-[62.984px]" data-name="Text">
      <Icon5 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[16px] left-[28px] not-italic text-[#0a0a0a] text-[12px] top-[2px]">COD</p>
    </div>
  );
}

function Container18() {
  return (
    <div className="h-[44px] relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel5 />
      <Text1 />
    </div>
  );
}

function PrimitiveLabel6() {
  return (
    <div className="absolute content-stretch flex h-[16px] items-center left-0 top-0 w-[344px]" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Payment Status</p>
    </div>
  );
}

function Text2() {
  return (
    <div className="absolute bg-[#fef9c2] h-[22px] left-0 rounded-[8px] top-[22px] w-[57.172px]" data-name="Text">
      <div className="content-stretch flex items-center justify-center overflow-clip px-[9px] py-[3px] relative rounded-[inherit] size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#a65f00] text-[12px]">Unpaid</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Container19() {
  return (
    <div className="h-[44px] relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel6 />
      <Text2 />
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] h-[105px] items-start pt-[9px] relative shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border-[rgba(0,0,0,0.1)] border-solid border-t inset-0 pointer-events-none" />
      <Container18 />
      <Container19 />
    </div>
  );
}

function Container11() {
  return (
    <div className="h-[389px] relative shrink-0 w-[392px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[12px] items-start px-[24px] relative size-full">
        <Container12 />
        <Container13 />
        <Container14 />
        <Container15 />
        <Container16 />
        <Container17 />
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="bg-white col-1 content-stretch flex flex-col gap-[24px] items-start justify-self-stretch p-px relative rounded-[14px] row-1 self-stretch shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container10 />
      <Container11 />
    </div>
  );
}

function Heading3() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-0 not-italic text-[#0a0a0a] text-[16px] top-[-2px]">{`Courier & Payment`}</p>
    </div>
  );
}

function Container21() {
  return (
    <div className="h-[66px] relative shrink-0 w-[392px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,24fr)_minmax(0,1fr)] pb-[18px] pt-[24px] px-[24px] relative size-full">
        <Heading3 />
      </div>
    </div>
  );
}

function PrimitiveLabel7() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Courier Company</p>
    </div>
  );
}

function Paragraph6() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">Pathao</p>
    </div>
  );
}

function Container24() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] h-[40px] items-start relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel7 />
      <Paragraph6 />
    </div>
  );
}

function PrimitiveLabel8() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Area</p>
    </div>
  );
}

function Paragraph7() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">Not set</p>
    </div>
  );
}

function Container25() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] h-[40px] items-start relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel8 />
      <Paragraph7 />
    </div>
  );
}

function PrimitiveLabel9() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Tracking Number</p>
    </div>
  );
}

function Paragraph8() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">Not assigned</p>
    </div>
  );
}

function Container26() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] h-[40px] items-start relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel9 />
      <Paragraph8 />
    </div>
  );
}

function PrimitiveLabel10() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Total Receivable (Courier Collection)</p>
    </div>
  );
}

function Paragraph9() {
  return (
    <div className="h-[28px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Inter:Bold','Noto_Sans_Bengali:Bold',sans-serif] font-bold leading-[28px] left-0 not-italic text-[#008236] text-[18px] top-[-1px]">৳90.00</p>
    </div>
  );
}

function Paragraph10() {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#6a7282] text-[12px] whitespace-pre-wrap">Amount to collect from customer</p>
    </div>
  );
}

function Container27() {
  return (
    <div className="bg-[#f0fdf4] h-[94px] relative rounded-[10px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#b9f8cf] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="content-stretch flex flex-col gap-[4px] items-start pb-px pt-[13px] px-[13px] relative size-full">
        <PrimitiveLabel10 />
        <Paragraph9 />
        <Paragraph10 />
      </div>
    </div>
  );
}

function Container23() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[250px] items-start relative shrink-0 w-full" data-name="Container">
      <Container24 />
      <Container25 />
      <Container26 />
      <Container27 />
    </div>
  );
}

function Icon6() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_123_983)" id="Icon">
          <path d={svgPaths.p34e03900} id="Vector" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p1f2c5400} id="Vector_2" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_123_983">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function PrimitiveLabel11() {
  return (
    <div className="h-[20px] relative shrink-0 w-[91.844px]" data-name="Primitive.label">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center relative size-full">
        <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] not-italic relative shrink-0 text-[#0a0a0a] text-[14px]">Confirm Order</p>
      </div>
    </div>
  );
}

function Container29() {
  return (
    <div className="content-stretch flex gap-[8px] h-[20px] items-center relative shrink-0 w-full" data-name="Container">
      <Icon6 />
      <PrimitiveLabel11 />
    </div>
  );
}

function PrimitiveLabel12() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Confirmation Type</p>
    </div>
  );
}

function PrimitiveSpan() {
  return (
    <div className="h-[20px] relative shrink-0 w-[79.828px]" data-name="Primitive.span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center overflow-clip relative rounded-[inherit] size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#717182] text-[14px] text-center">Select type...</p>
      </div>
    </div>
  );
}

function Icon7() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon" opacity="0.5">
          <path d="M4 6L8 10L12 6" id="Vector" stroke="var(--stroke-0, #717182)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function PrimitiveButton() {
  return (
    <div className="bg-[#f3f3f5] h-[36px] relative rounded-[8px] shrink-0 w-full" data-name="Primitive.button">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[13px] py-px relative size-full">
          <PrimitiveSpan />
          <Icon7 />
        </div>
      </div>
    </div>
  );
}

function Container30() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] h-[60px] items-start relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel12 />
      <PrimitiveButton />
    </div>
  );
}

function PrimitiveLabel13() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Courier Entry Method</p>
    </div>
  );
}

function PrimitiveSpan1() {
  return (
    <div className="h-[20px] relative shrink-0 w-[101.625px]" data-name="Primitive.span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center overflow-clip relative rounded-[inherit] size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#717182] text-[14px] text-center">Select method...</p>
      </div>
    </div>
  );
}

function Icon8() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon" opacity="0.5">
          <path d="M4 6L8 10L12 6" id="Vector" stroke="var(--stroke-0, #717182)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function PrimitiveButton1() {
  return (
    <div className="bg-[#f3f3f5] h-[36px] relative rounded-[8px] shrink-0 w-full" data-name="Primitive.button">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[13px] py-px relative size-full">
          <PrimitiveSpan1 />
          <Icon8 />
        </div>
      </div>
    </div>
  );
}

function Container31() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] h-[60px] items-start relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel13 />
      <PrimitiveButton1 />
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[#030213] h-[32px] opacity-50 relative rounded-[8px] shrink-0 w-full" data-name="Button">
      <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[172.08px] not-italic text-[14px] text-center text-white top-[5px]">Confirm Order</p>
    </div>
  );
}

function Container28() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[225px] items-start pt-[17px] relative shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border-[rgba(0,0,0,0.1)] border-solid border-t inset-0 pointer-events-none" />
      <Container29 />
      <Container30 />
      <Container31 />
      <Button3 />
    </div>
  );
}

function Container22() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[392px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[16px] items-start px-[24px] relative size-full">
        <Container23 />
        <Container28 />
      </div>
    </div>
  );
}

function Container20() {
  return (
    <div className="bg-white col-2 content-stretch flex flex-col gap-[24px] items-start justify-self-stretch p-px relative rounded-[14px] row-1 self-stretch shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container21 />
      <Container22 />
    </div>
  );
}

function Heading4() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-0 not-italic text-[#0a0a0a] text-[16px] top-[-2px]">{`Order Status & Source`}</p>
    </div>
  );
}

function Container33() {
  return (
    <div className="h-[66px] relative shrink-0 w-[392px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,24fr)_minmax(0,1fr)] pb-[18px] pt-[24px] px-[24px] relative size-full">
        <Heading4 />
      </div>
    </div>
  );
}

function PrimitiveLabel14() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Change Status</p>
    </div>
  );
}

function PrimitiveSpan2() {
  return (
    <div className="h-[20px] relative shrink-0 w-[139.375px]" data-name="Primitive.span">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center overflow-clip relative rounded-[inherit] size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#717182] text-[14px] text-center">Select status change...</p>
      </div>
    </div>
  );
}

function Icon9() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon" opacity="0.5">
          <path d="M4 6L8 10L12 6" id="Vector" stroke="var(--stroke-0, #717182)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function PrimitiveButton2() {
  return (
    <div className="bg-[#f3f3f5] h-[36px] relative rounded-[8px] shrink-0 w-full" data-name="Primitive.button">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[13px] py-px relative size-full">
          <PrimitiveSpan2 />
          <Icon9 />
        </div>
      </div>
    </div>
  );
}

function Container35() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] h-[60px] items-start relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel14 />
      <PrimitiveButton2 />
    </div>
  );
}

function PrimitiveLabel15() {
  return (
    <div className="absolute content-stretch flex h-[16px] items-center left-0 top-0 w-[344px]" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Order Source</p>
    </div>
  );
}

function Text3() {
  return (
    <div className="absolute h-[22px] left-0 rounded-[8px] top-[26px] w-[61.844px]" data-name="Text">
      <div className="content-stretch flex items-center justify-center overflow-clip px-[9px] py-[3px] relative rounded-[inherit] size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#0a0a0a] text-[12px]">Website</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Container37() {
  return (
    <div className="h-[48px] relative shrink-0 w-full" data-name="Container">
      <PrimitiveLabel15 />
      <Text3 />
    </div>
  );
}

function Paragraph11() {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#4a5565] text-[12px] whitespace-pre-wrap">Confirmed By</p>
    </div>
  );
}

function Paragraph12() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">Admin User</p>
    </div>
  );
}

function Container39() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] h-[40px] items-start relative shrink-0 w-full" data-name="Container">
      <Paragraph11 />
      <Paragraph12 />
    </div>
  );
}

function Paragraph13() {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#4a5565] text-[12px] whitespace-pre-wrap">Created Date</p>
    </div>
  );
}

function Paragraph14() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">2026-02-24</p>
    </div>
  );
}

function Container40() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] h-[40px] items-start relative shrink-0 w-full" data-name="Container">
      <Paragraph13 />
      <Paragraph14 />
    </div>
  );
}

function Container38() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] h-[97px] items-start pt-[9px] relative shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border-[rgba(0,0,0,0.1)] border-solid border-t inset-0 pointer-events-none" />
      <Container39 />
      <Container40 />
    </div>
  );
}

function Container36() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[174px] items-start pt-[17px] relative shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border-[rgba(0,0,0,0.1)] border-solid border-t inset-0 pointer-events-none" />
      <Container37 />
      <Container38 />
    </div>
  );
}

function Container34() {
  return (
    <div className="h-[274px] relative shrink-0 w-[392px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[16px] items-start px-[24px] relative size-full">
        <Container35 />
        <Container36 />
      </div>
    </div>
  );
}

function Container32() {
  return (
    <div className="bg-white col-3 content-stretch flex flex-col gap-[24px] items-start justify-self-stretch p-px relative rounded-[14px] row-1 self-stretch shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container33 />
      <Container34 />
    </div>
  );
}

function Container8() {
  return (
    <div className="gap-x-[24px] gap-y-[24px] grid grid-cols-[repeat(3,minmax(0,1fr))] grid-rows-[repeat(1,minmax(0,1fr))] h-[607px] relative shrink-0 w-full" data-name="Container">
      <Container9 />
      <Container20 />
      <Container32 />
    </div>
  );
}

function Heading5() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-0 not-italic text-[#0a0a0a] text-[16px] top-[-2px]">Order Notes</p>
    </div>
  );
}

function Container43() {
  return (
    <div className="absolute gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,24fr)_minmax(0,1fr)] h-[66px] left-px pb-[18px] pt-[24px] px-[24px] top-px w-[601px]" data-name="Container">
      <Heading5 />
    </div>
  );
}

function Container44() {
  return (
    <div className="absolute bg-[#f9fafb] content-stretch flex h-[100px] items-start left-[25px] p-[12px] rounded-[10px] top-[91px] w-[553px]" data-name="Container">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">Customer requested expedited shipping</p>
    </div>
  );
}

function Container42() {
  return (
    <div className="bg-white col-1 justify-self-stretch relative rounded-[14px] row-1 self-stretch shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container43 />
      <Container44 />
    </div>
  );
}

function Heading6() {
  return (
    <div className="h-[24px] relative shrink-0 w-[58.063px]" data-name="Heading 4">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-0 not-italic text-[#0a0a0a] text-[16px] top-[-2px]">Call Log</p>
      </div>
    </div>
  );
}

function Text4() {
  return (
    <div className="h-[22px] relative rounded-[8px] shrink-0 w-[69.578px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center overflow-clip px-[9px] py-[3px] relative rounded-[inherit] size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#0a0a0a] text-[12px]">1 attempt</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Container47() {
  return (
    <div className="col-1 content-stretch flex items-center justify-between justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Container">
      <Heading6 />
      <Text4 />
    </div>
  );
}

function Container46() {
  return (
    <div className="h-[66px] relative shrink-0 w-[601px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,24fr)_minmax(0,1fr)] pb-[18px] pt-[24px] px-[24px] relative size-full">
        <Container47 />
      </div>
    </div>
  );
}

function TextInput() {
  return (
    <div className="bg-[#f3f3f5] flex-[1_0_0] h-[36px] min-h-px min-w-px relative rounded-[8px]" data-name="Text Input">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center px-[12px] py-[4px] relative size-full">
          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[#717182] text-[14px]">Add call note...</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Icon10() {
  return (
    <div className="absolute left-[10px] size-[16px] top-[8px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_114_1596)" id="Icon">
          <path d={svgPaths.p2a44c680} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p31372c80} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p29e05ec0} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_114_1596">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button4() {
  return (
    <div className="bg-[#030213] h-[32px] relative rounded-[8px] shrink-0 w-[67.641px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon10 />
        <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[46.5px] not-italic text-[14px] text-center text-white top-[5px]">Log</p>
      </div>
    </div>
  );
}

function Container49() {
  return (
    <div className="content-stretch flex gap-[8px] h-[36px] items-start relative shrink-0 w-full" data-name="Container">
      <TextInput />
      <Button4 />
    </div>
  );
}

function Paragraph15() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">Initial call - customer confirmed order</p>
    </div>
  );
}

function Text5() {
  return (
    <div className="h-[16px] relative shrink-0 w-[60.125px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Sarah Chen</p>
      </div>
    </div>
  );
}

function Text6() {
  return (
    <div className="h-[16px] relative shrink-0 w-[4.875px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">•</p>
      </div>
    </div>
  );
}

function Text7() {
  return (
    <div className="h-[16px] relative shrink-0 w-[114.922px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">2026-02-25 10:30 AM</p>
      </div>
    </div>
  );
}

function Container51() {
  return (
    <div className="content-stretch flex gap-[8px] h-[16px] items-center relative shrink-0 w-full" data-name="Container">
      <Text5 />
      <Text6 />
      <Text7 />
    </div>
  );
}

function Container50() {
  return (
    <div className="bg-[#eff6ff] h-[58px] relative rounded-[4px] shrink-0 w-full" data-name="Container">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[4px] items-start pb-px pt-[9px] px-[9px] relative size-full">
          <Paragraph15 />
          <Container51 />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#dbeafe] border-solid inset-0 pointer-events-none rounded-[4px]" />
    </div>
  );
}

function Container48() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[601px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[12px] items-start px-[24px] relative size-full">
        <Container49 />
        <Container50 />
      </div>
    </div>
  );
}

function Container45() {
  return (
    <div className="bg-white col-2 content-stretch flex flex-col gap-[24px] items-start justify-self-stretch p-px relative rounded-[14px] row-1 self-stretch shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container46 />
      <Container48 />
    </div>
  );
}

function Container41() {
  return (
    <div className="gap-x-[24px] gap-y-[24px] grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[repeat(1,minmax(0,1fr))] h-[222px] relative shrink-0 w-full" data-name="Container">
      <Container42 />
      <Container45 />
    </div>
  );
}

function Heading7() {
  return (
    <div className="h-[16px] relative shrink-0 w-[86.266px]" data-name="Heading 4">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[16px] left-0 not-italic text-[#0a0a0a] text-[16px] top-[-2px]">Order Items</p>
      </div>
    </div>
  );
}

function Container53() {
  return (
    <div className="absolute content-stretch flex h-[40px] items-center justify-between left-px pl-[24px] pr-[1117.734px] top-px w-[1228px]" data-name="Container">
      <Heading7 />
    </div>
  );
}

function HeaderCell() {
  return (
    <div className="absolute h-[40px] left-0 top-0 w-[544.531px]" data-name="Header Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[8px] not-italic text-[#0a0a0a] text-[14px] top-[8.75px]">Product</p>
    </div>
  );
}

function HeaderCell1() {
  return (
    <div className="absolute h-[40px] left-[544.53px] top-0 w-[159.453px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[152.33px] not-italic text-[#0a0a0a] text-[14px] text-right top-[8.75px]">Quantity</p>
    </div>
  );
}

function HeaderCell2() {
  return (
    <div className="absolute h-[40px] left-[703.98px] top-0 w-[151.469px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[143.91px] not-italic text-[#0a0a0a] text-[14px] text-right top-[8.75px]">Amount</p>
    </div>
  );
}

function HeaderCell3() {
  return (
    <div className="absolute h-[40px] left-[855.45px] top-0 w-[161.594px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[154.52px] not-italic text-[#0a0a0a] text-[14px] text-right top-[8.75px]">Discount</p>
    </div>
  );
}

function HeaderCell4() {
  return (
    <div className="absolute h-[40px] left-[1017.05px] top-0 w-[162.953px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[155.2px] not-italic text-[#0a0a0a] text-[14px] text-right top-[8.75px]">Total</p>
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

function Paragraph16() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">Blue Light Glasses - Black - Medium</p>
    </div>
  );
}

function Paragraph17() {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#4a5565] text-[12px] whitespace-pre-wrap">BLG-BLK-M</p>
    </div>
  );
}

function Container54() {
  return (
    <div className="absolute content-stretch flex flex-col h-[36px] items-start left-[8px] top-[8.5px] w-[528.531px]" data-name="Container">
      <Paragraph16 />
      <Paragraph17 />
    </div>
  );
}

function TableCell() {
  return (
    <div className="absolute h-[53px] left-0 top-0 w-[544.531px]" data-name="Table Cell">
      <Container54 />
    </div>
  );
}

function TableCell1() {
  return (
    <div className="absolute h-[53px] left-[544.53px] top-0 w-[159.453px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[151.91px] not-italic text-[#0a0a0a] text-[14px] text-right top-[15.5px]">2</p>
    </div>
  );
}

function TableCell2() {
  return (
    <div className="absolute h-[53px] left-[703.98px] top-0 w-[151.469px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular','Noto_Sans_Bengali:Regular',sans-serif] font-normal leading-[20px] left-[143.72px] not-italic text-[#0a0a0a] text-[14px] text-right top-[15.5px]">৳45.00</p>
    </div>
  );
}

function TableCell3() {
  return (
    <div className="absolute h-[53px] left-[855.45px] top-0 w-[161.594px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular','Noto_Sans_Bengali:Regular',sans-serif] font-normal leading-[20px] left-[154.41px] not-italic text-[#0a0a0a] text-[14px] text-right top-[15.5px]">৳0.00</p>
    </div>
  );
}

function TableCell4() {
  return (
    <div className="absolute h-[53px] left-[1017.05px] top-0 w-[162.953px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Medium','Noto_Sans_Bengali:Medium',sans-serif] font-medium leading-[20px] left-[155.92px] not-italic text-[#0a0a0a] text-[14px] text-right top-[15.5px]">৳90.00</p>
    </div>
  );
}

function TableRow1() {
  return (
    <div className="absolute border-[rgba(0,0,0,0.1)] border-b border-solid h-[53px] left-0 top-0 w-[1180px]" data-name="Table Row">
      <TableCell />
      <TableCell1 />
      <TableCell2 />
      <TableCell3 />
      <TableCell4 />
    </div>
  );
}

function TableCell5() {
  return (
    <div className="absolute h-[37px] left-0 top-0 w-[1017.047px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[1009.08px] not-italic text-[#0a0a0a] text-[14px] text-right top-[7.5px]">Subtotal:</p>
    </div>
  );
}

function TableCell6() {
  return (
    <div className="absolute h-[37px] left-[1017.05px] top-0 w-[162.953px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold','Noto_Sans_Bengali:SemiBold',sans-serif] font-semibold leading-[20px] left-[155.92px] not-italic text-[#0a0a0a] text-[14px] text-right top-[7.5px]">৳90.00</p>
    </div>
  );
}

function TableRow2() {
  return (
    <div className="absolute bg-[#f9fafb] border-[rgba(0,0,0,0.1)] border-b border-solid h-[37px] left-0 top-[53px] w-[1180px]" data-name="Table Row">
      <TableCell5 />
      <TableCell6 />
    </div>
  );
}

function TableCell7() {
  return (
    <div className="absolute h-[37px] left-0 top-0 w-[1017.047px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[1009.92px] not-italic text-[#0a0a0a] text-[14px] text-right top-[7.5px]">Shipping Fee:</p>
    </div>
  );
}

function TableCell8() {
  return (
    <div className="absolute h-[37px] left-[1017.05px] top-0 w-[162.953px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular','Noto_Sans_Bengali:Regular',sans-serif] font-normal leading-[20px] left-[155.22px] not-italic text-[#0a0a0a] text-[14px] text-right top-[7.5px]">৳60.00</p>
    </div>
  );
}

function TableRow3() {
  return (
    <div className="absolute border-[rgba(0,0,0,0.1)] border-b border-solid h-[37px] left-0 top-[90px] w-[1180px]" data-name="Table Row">
      <TableCell7 />
      <TableCell8 />
    </div>
  );
}

function TableCell9() {
  return (
    <div className="absolute h-[37px] left-0 top-0 w-[1017.047px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[1009.59px] not-italic text-[#0a0a0a] text-[14px] text-right top-[7.5px]">Discount:</p>
    </div>
  );
}

function TableCell10() {
  return (
    <div className="absolute h-[37px] left-[1017.05px] top-0 w-[162.953px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular','Noto_Sans_Bengali:Regular',sans-serif] font-normal leading-[20px] left-[155.77px] not-italic text-[#0a0a0a] text-[14px] text-right top-[7.5px]">৳0.00</p>
    </div>
  );
}

function TableRow4() {
  return (
    <div className="absolute border-[rgba(0,0,0,0.1)] border-b border-solid h-[37px] left-0 top-[127px] w-[1180px]" data-name="Table Row">
      <TableCell9 />
      <TableCell10 />
    </div>
  );
}

function TableCell11() {
  return (
    <div className="absolute h-[40.5px] left-0 top-0 w-[1017.047px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[24px] left-[1009.7px] not-italic text-[#0a0a0a] text-[16px] text-right top-[6.5px]">Order Total:</p>
    </div>
  );
}

function TableCell12() {
  return (
    <div className="absolute h-[40.5px] left-[1017.05px] top-0 w-[162.953px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Bold','Noto_Sans_Bengali:Bold',sans-serif] font-bold leading-[24px] left-[155.3px] not-italic text-[#0a0a0a] text-[16px] text-right top-[6.5px]">৳150.00</p>
    </div>
  );
}

function TableRow5() {
  return (
    <div className="absolute bg-[#eff6ff] h-[40.5px] left-0 top-[164px] w-[1180px]" data-name="Table Row">
      <TableCell11 />
      <TableCell12 />
    </div>
  );
}

function TableBody() {
  return (
    <div className="absolute h-[204.5px] left-0 top-[40px] w-[1180px]" data-name="Table Body">
      <TableRow1 />
      <TableRow2 />
      <TableRow3 />
      <TableRow4 />
      <TableRow5 />
    </div>
  );
}

function Table() {
  return (
    <div className="absolute h-[244.5px] left-[25px] overflow-clip top-[65px] w-[1180px]" data-name="Table">
      <TableHeader />
      <TableBody />
    </div>
  );
}

function Container52() {
  return (
    <div className="bg-white h-[334.5px] relative rounded-[14px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container53 />
      <Table />
    </div>
  );
}

function Heading8() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-0 not-italic text-[#0a0a0a] text-[16px] top-[-2px]">Additional / Prescription Lens</p>
    </div>
  );
}

function Container56() {
  return (
    <div className="absolute gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,24fr)_minmax(0,1fr)] h-[66px] left-px pb-[18px] pt-[24px] px-[24px] top-px w-[1228px]" data-name="Container">
      <Heading8 />
    </div>
  );
}

function PrimitiveLabel16() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Lens Type</p>
    </div>
  );
}

function Paragraph18() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">None</p>
    </div>
  );
}

function Container58() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[44px] items-start left-0 top-0 w-[382.656px]" data-name="Container">
      <PrimitiveLabel16 />
      <Paragraph18 />
    </div>
  );
}

function PrimitiveLabel17() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium','Noto_Sans_Bengali:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Price (৳)</p>
    </div>
  );
}

function Paragraph19() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular','Noto_Sans_Bengali:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">৳0.00</p>
    </div>
  );
}

function Container59() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[44px] items-start left-[398.66px] top-0 w-[382.672px]" data-name="Container">
      <PrimitiveLabel17 />
      <Paragraph19 />
    </div>
  );
}

function PrimitiveLabel18() {
  return (
    <div className="content-stretch flex h-[16px] items-center relative shrink-0 w-full" data-name="Primitive.label">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[#4a5565] text-[12px]">Upload Prescription</p>
    </div>
  );
}

function Paragraph20() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[20px] min-h-px min-w-px not-italic relative text-[#0a0a0a] text-[14px] whitespace-pre-wrap">No prescription</p>
    </div>
  );
}

function Container60() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[44px] items-start left-[797.33px] top-0 w-[382.656px]" data-name="Container">
      <PrimitiveLabel18 />
      <Paragraph20 />
    </div>
  );
}

function Container57() {
  return (
    <div className="absolute h-[44px] left-[25px] top-[91px] w-[1180px]" data-name="Container">
      <Container58 />
      <Container59 />
      <Container60 />
    </div>
  );
}

function Container55() {
  return (
    <div className="bg-[#faf5ff] h-[160px] relative rounded-[14px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#e9d4ff] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container56 />
      <Container57 />
    </div>
  );
}

function Icon11() {
  return (
    <div className="absolute left-0 size-[16px] top-[4px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p1bb15080} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Heading9() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <Icon11 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-[24px] not-italic text-[#0a0a0a] text-[16px] top-[-2px]">Send SMS to Customer</p>
    </div>
  );
}

function Container62() {
  return (
    <div className="h-[66px] relative shrink-0 w-[1228px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,24fr)_minmax(0,1fr)] pb-[18px] pt-[24px] px-[24px] relative size-full">
        <Heading9 />
      </div>
    </div>
  );
}

function TextArea() {
  return (
    <div className="bg-[#f3f3f5] flex-[1_0_0] h-[64px] min-h-px min-w-px relative rounded-[8px]" data-name="Text Area">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start px-[12px] py-[8px] relative size-full">
          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#717182] text-[14px]">Type your SMS message here...</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Icon12() {
  return (
    <div className="absolute left-[12px] size-[16px] top-[24px]" data-name="Icon">
      <svg className="absolute block inset-0" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p1bb15080} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button5() {
  return (
    <div className="bg-[#030213] h-[64px] opacity-50 relative rounded-[8px] shrink-0 w-[111.703px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon12 />
        <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[68.5px] not-italic text-[14px] text-center text-white top-[21px]">Send SMS</p>
      </div>
    </div>
  );
}

function Container64() {
  return (
    <div className="content-stretch flex gap-[12px] h-[64px] items-start relative shrink-0 w-full" data-name="Container">
      <TextArea />
      <Button5 />
    </div>
  );
}

function Paragraph21() {
  return (
    <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#4a5565] text-[12px] whitespace-pre-wrap">Recipient: +880 1711 123456 • Via SMS API</p>
    </div>
  );
}

function Container63() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[1228px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[8px] items-start px-[24px] relative size-full">
        <Container64 />
        <Paragraph21 />
      </div>
    </div>
  );
}

function Container61() {
  return (
    <div className="bg-[#eff6ff] content-stretch flex flex-col gap-[24px] h-[204px] items-start p-px relative rounded-[14px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#bedbff] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container62 />
      <Container63 />
    </div>
  );
}

function Icon13() {
  return (
    <div className="absolute left-0 size-[16px] top-[4px]" data-name="Icon">
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

function Heading10() {
  return (
    <div className="col-1 justify-self-stretch relative row-1 self-stretch shrink-0" data-name="Heading 4">
      <Icon13 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-[24px] not-italic text-[#0a0a0a] text-[16px] top-[-2px]">Activity Log</p>
    </div>
  );
}

function Container66() {
  return (
    <div className="absolute gap-x-[6px] gap-y-[6px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__minmax(0,24fr)_minmax(0,1fr)] h-[54px] left-px pb-[6px] pt-[24px] px-[24px] top-px w-[1228px]" data-name="Container">
      <Heading10 />
    </div>
  );
}

function Paragraph22() {
  return (
    <div className="content-stretch flex h-[20px] items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="flex-[1_0_0] font-['Inter:Medium',sans-serif] font-medium leading-[20px] min-h-px min-w-px not-italic relative text-[#101828] text-[14px] whitespace-pre-wrap">Order created from WooCommerce</p>
    </div>
  );
}

function Text8() {
  return (
    <div className="h-[16px] relative shrink-0 w-[37.609px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[16px] not-italic relative shrink-0 text-[#6a7282] text-[12px]">System</p>
      </div>
    </div>
  );
}

function Text9() {
  return (
    <div className="h-[16px] relative shrink-0 w-[4.875px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[16px] not-italic relative shrink-0 text-[#6a7282] text-[12px]">•</p>
      </div>
    </div>
  );
}

function Text10() {
  return (
    <div className="h-[16px] relative shrink-0 w-[61.359px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[16px] not-italic relative shrink-0 text-[#6a7282] text-[12px]">2026-02-24</p>
      </div>
    </div>
  );
}

function Container68() {
  return (
    <div className="content-stretch flex gap-[8px] h-[16px] items-center relative shrink-0 w-full" data-name="Container">
      <Text8 />
      <Text9 />
      <Text10 />
    </div>
  );
}

function Container67() {
  return (
    <div className="absolute bg-[#f9fafb] h-[70px] left-[25px] rounded-[4px] top-[79px] w-[1180px]" data-name="Container">
      <div className="content-stretch flex flex-col gap-[8px] items-start overflow-clip pb-px pt-[13px] px-[13px] relative rounded-[inherit] size-full">
        <Paragraph22 />
        <Container68 />
      </div>
      <div aria-hidden="true" className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[4px]" />
    </div>
  );
}

function Container65() {
  return (
    <div className="bg-white h-[174px] relative rounded-[14px] shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Container66 />
      <Container67 />
    </div>
  );
}

function MainContent() {
  return (
    <div className="absolute bg-[#f9fafb] content-stretch flex flex-col gap-[24px] h-[2030.5px] items-start left-[280px] top-[88px] w-[1230px]" data-name="Main Content">
      <Container />
      <Container8 />
      <Container41 />
      <Container52 />
      <Container55 />
      <Container61 />
      <Container65 />
    </div>
  );
}

function Section() {
  return <div className="absolute h-0 left-0 top-[2142.5px] w-[1534px]" data-name="Section" />;
}

function Ty() {
  return (
    <div className="absolute bg-white h-[944px] left-0 top-0 w-[1534px]" data-name="TY">
      <MainContent />
      <Section />
    </div>
  );
}

function Icon14() {
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

function Link() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <Icon14 />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Dashboard</p>
    </div>
  );
}

function Icon15() {
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

function Container70() {
  return (
    <div className="absolute h-[36px] left-0 top-0 w-[223px]" data-name="Container">
      <Icon15 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Purchase</p>
    </div>
  );
}

function Text11() {
  return (
    <div className="h-[20px] relative shrink-0 w-[101.047px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Purchase Orders</p>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[81.953px] relative size-full">
          <Text11 />
        </div>
      </div>
    </div>
  );
}

function Text12() {
  return (
    <div className="h-[20px] relative shrink-0 w-[62.281px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Create PO</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[120.719px] relative size-full">
          <Text12 />
        </div>
      </div>
    </div>
  );
}

function Text13() {
  return (
    <div className="h-[20px] relative shrink-0 w-[56.734px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Suppliers</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[126.266px] relative size-full">
          <Text13 />
        </div>
      </div>
    </div>
  );
}

function Container71() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[116px] items-start left-[28px] top-[40px] w-[195px]" data-name="Container">
      <Link1 />
      <Link2 />
      <Link3 />
    </div>
  );
}

function Container69() {
  return (
    <div className="h-[156px] relative shrink-0 w-full" data-name="Container">
      <Container70 />
      <Container71 />
    </div>
  );
}

function Icon16() {
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

function Container73() {
  return (
    <div className="absolute h-[36px] left-0 top-0 w-[223px]" data-name="Container">
      <Icon16 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Inventory</p>
    </div>
  );
}

function Text14() {
  return (
    <div className="h-[20px] relative shrink-0 w-[54.234px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Products</p>
      </div>
    </div>
  );
}

function Link4() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[128.766px] relative size-full">
          <Text14 />
        </div>
      </div>
    </div>
  );
}

function Text15() {
  return (
    <div className="h-[20px] relative shrink-0 w-[64.969px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Shipments</p>
      </div>
    </div>
  );
}

function Link5() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[118.031px] relative size-full">
          <Text15 />
        </div>
      </div>
    </div>
  );
}

function Text16() {
  return (
    <div className="h-[20px] relative shrink-0 w-[109.984px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Stock Movements</p>
      </div>
    </div>
  );
}

function Link6() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[73.016px] relative size-full">
          <Text16 />
        </div>
      </div>
    </div>
  );
}

function Text17() {
  return (
    <div className="h-[20px] relative shrink-0 w-[69.156px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Warehouse</p>
      </div>
    </div>
  );
}

function Link7() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[113.844px] relative size-full">
          <Text17 />
        </div>
      </div>
    </div>
  );
}

function Text18() {
  return (
    <div className="h-[20px] relative shrink-0 w-[33.344px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Audit</p>
      </div>
    </div>
  );
}

function Link8() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[149.656px] relative size-full">
          <Text18 />
        </div>
      </div>
    </div>
  );
}

function Text19() {
  return (
    <div className="h-[20px] relative shrink-0 w-[46.5px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Receive</p>
      </div>
    </div>
  );
}

function Text20() {
  return (
    <div className="bg-[#fb2c36] relative rounded-[8px] shrink-0 size-[20px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center overflow-clip p-px relative rounded-[inherit] size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[12px] text-white">2</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Link9() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[12px] relative size-full">
          <Text19 />
          <Text20 />
        </div>
      </div>
    </div>
  );
}

function Container74() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[236px] items-start left-[28px] top-[40px] w-[195px]" data-name="Container">
      <Link4 />
      <Link5 />
      <Link6 />
      <Link7 />
      <Link8 />
      <Link9 />
    </div>
  );
}

function Container72() {
  return (
    <div className="h-[276px] relative shrink-0 w-full" data-name="Container">
      <Container73 />
      <Container74 />
    </div>
  );
}

function Icon17() {
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

function Container76() {
  return (
    <div className="absolute h-[36px] left-0 top-0 w-[223px]" data-name="Container">
      <Icon17 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Fulfilment</p>
    </div>
  );
}

function Text21() {
  return (
    <div className="h-[20px] relative shrink-0 w-[42.828px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#1447e6] text-[14px]">Orders</p>
      </div>
    </div>
  );
}

function Link10() {
  return (
    <div className="bg-[#eff6ff] h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[140.172px] relative size-full">
          <Text21 />
        </div>
      </div>
    </div>
  );
}

function Text22() {
  return (
    <div className="h-[20px] relative shrink-0 w-[68.313px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Operations</p>
      </div>
    </div>
  );
}

function Link11() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[114.688px] relative size-full">
          <Text22 />
        </div>
      </div>
    </div>
  );
}

function Container77() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[76px] items-start left-[28px] top-[40px] w-[195px]" data-name="Container">
      <Link10 />
      <Link11 />
    </div>
  );
}

function Container75() {
  return (
    <div className="h-[116px] relative shrink-0 w-full" data-name="Container">
      <Container76 />
      <Container77 />
    </div>
  );
}

function Icon18() {
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

function Link12() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <Icon18 />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Returns</p>
    </div>
  );
}

function Icon19() {
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

function Container79() {
  return (
    <div className="absolute h-[36px] left-0 top-0 w-[223px]" data-name="Container">
      <Icon19 />
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Finance</p>
    </div>
  );
}

function Text23() {
  return (
    <div className="h-[20px] relative shrink-0 w-[56.188px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Expenses</p>
      </div>
    </div>
  );
}

function Link13() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[126.813px] relative size-full">
          <Text23 />
        </div>
      </div>
    </div>
  );
}

function Text24() {
  return (
    <div className="h-[20px] relative shrink-0 w-[86.781px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#4a5565] text-[14px]">Profit Analysis</p>
      </div>
    </div>
  );
}

function Link14() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pl-[12px] pr-[96.219px] relative size-full">
          <Text24 />
        </div>
      </div>
    </div>
  );
}

function Container80() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[76px] items-start left-[28px] top-[40px] w-[195px]" data-name="Container">
      <Link13 />
      <Link14 />
    </div>
  );
}

function Container78() {
  return (
    <div className="h-[116px] relative shrink-0 w-full" data-name="Container">
      <Container79 />
      <Container80 />
    </div>
  );
}

function Icon20() {
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

function Link15() {
  return (
    <div className="h-[36px] relative rounded-[10px] shrink-0 w-full" data-name="Link">
      <Icon20 />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[40px] not-italic text-[#364153] text-[14px] top-[7px]">Reports</p>
    </div>
  );
}

function Navigation() {
  return (
    <div className="h-[828px] relative shrink-0 w-full" data-name="Navigation">
      <div className="content-stretch flex flex-col gap-[4px] items-start pt-[16px] px-[16px] relative size-full">
        <Link />
        <Container69 />
        <Container72 />
        <Container75 />
        <Link12 />
        <Container78 />
        <Link15 />
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

function Icon21() {
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

function Button6() {
  return (
    <div className="relative rounded-[10px] shrink-0 size-[36px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[8px] px-[8px] relative size-full">
        <Icon21 />
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

function Container82() {
  return (
    <div className="h-[36px] relative shrink-0 w-[156.641px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[16px] items-center relative size-full">
        <Button6 />
        <Heading1 />
      </div>
    </div>
  );
}

function Icon22() {
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

function Text25() {
  return (
    <div className="absolute bg-[#fb2c36] h-[22px] left-[127.42px] rounded-[8px] top-[7px] w-[54.063px]" data-name="Text">
      <div className="content-stretch flex items-center justify-center overflow-clip px-[9px] py-[3px] relative rounded-[inherit] size-full">
        <p className="font-['Inter:Medium',sans-serif] font-medium leading-[16px] not-italic relative shrink-0 text-[12px] text-center text-white">Admin</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Button7() {
  return (
    <div className="bg-white flex-[1_0_0] h-[36px] min-h-px min-w-px relative rounded-[8px]" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.1)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon22 />
        <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-[74px] not-italic text-[#0a0a0a] text-[14px] text-center top-[7px]">Admin User</p>
        <Text25 />
      </div>
    </div>
  );
}

function Container83() {
  return (
    <div className="h-[36px] relative shrink-0 w-[194.484px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center relative size-full">
        <Button7 />
      </div>
    </div>
  );
}

function Container81() {
  return (
    <div className="h-[63px] relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[16px] relative size-full">
          <Container82 />
          <Container83 />
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col h-[64px] items-start left-0 pb-px top-0 w-[1534px]" data-name="Header">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <Container81 />
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