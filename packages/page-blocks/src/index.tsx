import "./styles.css";

// The following are necessary for tailwind to work with dynamic values
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const verticalPaddingClasses =
    "py-[16px] py-[17px] py-[18px] py-[19px] py-[20px] py-[21px] py-[22px] py-[23px] py-[24px] py-[25px] py-[26px] py-[27px] py-[28px] py-[29px] py-[30px] py-[31px] py-[32px] py-[33px] py-[34px] py-[35px] py-[36px] py-[37px] py-[38px] py-[39px] py-[40px] py-[41px] py-[42px] py-[43px] py-[44px] py-[45px] py-[46px] py-[47px] py-[48px] py-[49px] py-[50px] py-[51px] py-[52px] py-[53px] py-[54px] py-[55px] py-[56px] py-[57px] py-[58px] py-[59px] py-[60px] py-[61px] py-[62px] py-[63px] py-[64px] py-[65px] py-[66px] py-[67px] py-[68px] py-[69px] py-[70px] py-[71px] py-[72px] py-[73px] py-[74px] py-[75px] py-[76px] py-[77px] py-[78px] py-[79px] py-[80px] py-[81px] py-[82px] py-[83px] py-[84px] py-[85px] py-[86px] py-[87px] py-[88px] py-[89px] py-[90px] py-[91px] py-[92px] py-[93px] py-[94px] py-[95px] py-[96px] py-[97px] py-[98px] py-[99px] py-[100px] py-[101px] py-[102px] py-[103px] py-[104px] py-[105px] py-[106px] py-[107px] py-[108px] py-[109px] py-[110px] py-[111px] py-[112px] py-[113px] py-[114px] py-[115px] py-[116px] py-[117px] py-[118px] py-[119px] py-[120px] py-[121px] py-[122px] py-[123px] py-[124px] py-[125px] py-[126px] py-[127px] py-[128px] py-[129px] py-[130px] py-[131px] py-[132px] py-[133px] py-[134px] py-[135px] py-[136px] py-[137px] py-[138px] py-[139px] py-[140px] py-[141px] py-[142px] py-[143px] py-[144px] py-[145px] py-[146px] py-[147px] py-[148px] py-[149px] py-[150px] py-[151px] py-[152px] py-[153px] py-[154px] py-[155px] py-[156px] py-[157px] py-[158px] py-[159px] py-[160px] py-[161px] py-[162px] py-[163px] py-[164px] py-[165px] py-[166px] py-[167px] py-[168px] py-[169px] py-[170px] py-[171px] py-[172px] py-[173px] py-[174px] py-[175px] py-[176px] py-[177px] py-[178px] py-[179px] py-[180px] py-[181px] py-[182px] py-[183px] py-[184px] py-[185px] py-[186px] py-[187px] py-[188px] py-[189px] py-[190px] py-[191px] py-[192px] py-[193px] py-[194px] py-[195px] py-[196px] py-[197px] py-[198px] py-[199px] py-[200px]";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const maxWClasses =
    "lg:max-w-[1%] lg:max-w-[2%] lg:max-w-[3%] lg:max-w-[4%] lg:max-w-[5%] lg:max-w-[6%] lg:max-w-[7%] lg:max-w-[8%] lg:max-w-[9%] lg:max-w-[10%] lg:max-w-[11%] lg:max-w-[12%] lg:max-w-[13%] lg:max-w-[14%] lg:max-w-[15%] lg:max-w-[16%] lg:max-w-[17%] lg:max-w-[18%] lg:max-w-[19%] lg:max-w-[20%] lg:max-w-[21%] lg:max-w-[22%] lg:max-w-[23%] lg:max-w-[24%] lg:max-w-[25%] lg:max-w-[26%] lg:max-w-[27%] lg:max-w-[28%] lg:max-w-[29%] lg:max-w-[30%] lg:max-w-[31%] lg:max-w-[32%] lg:max-w-[33%] lg:max-w-[34%] lg:max-w-[35%] lg:max-w-[36%] lg:max-w-[37%] lg:max-w-[38%] lg:max-w-[39%] lg:max-w-[40%] lg:max-w-[41%] lg:max-w-[42%] lg:max-w-[43%] lg:max-w-[44%] lg:max-w-[45%] lg:max-w-[46%] lg:max-w-[47%] lg:max-w-[48%] lg:max-w-[49%] lg:max-w-[50%] lg:max-w-[51%] lg:max-w-[52%] lg:max-w-[53%] lg:max-w-[54%] lg:max-w-[55%] lg:max-w-[56%] lg:max-w-[57%] lg:max-w-[58%] lg:max-w-[59%] lg:max-w-[60%] lg:max-w-[61%] lg:max-w-[62%] lg:max-w-[63%] lg:max-w-[64%] lg:max-w-[65%] lg:max-w-[66%] lg:max-w-[67%] lg:max-w-[68%] lg:max-w-[69%] lg:max-w-[70%] lg:max-w-[71%] lg:max-w-[72%] lg:max-w-[73%] lg:max-w-[74%] lg:max-w-[75%] lg:max-w-[76%] lg:max-w-[77%] lg:max-w-[78%] lg:max-w-[79%] lg:max-w-[80%] lg:max-w-[81%] lg:max-w-[82%] lg:max-w-[83%] lg:max-w-[84%] lg:max-w-[85%] lg:max-w-[86%] lg:max-w-[87%] lg:max-w-[88%] lg:max-w-[89%] lg:max-w-[90%] lg:max-w-[91%] lg:max-w-[92%] lg:max-w-[93%] lg:max-w-[94%] lg:max-w-[95%] lg:max-w-[96%] lg:max-w-[97%] lg:max-w-[98%] lg:max-w-[99%] lg:max-w-[100%]";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fontSize =
    "text-lg text-xl text-2xl text-3xl text-4xl text-5xl text-6xl text-7xl text-8xl lg:text-lg lg:text-xl lg:text-2xl lg:text-3xl lg:text-4xl lg:text-5xl lg:text-6xl lg:text-7xl lg:text-8xl";

export * from "./rich-text";
export * from "./footer";
export * from "./header";
export * from "./featured";
export * from "./banner";
export * from "./email-form";
export * from "./hero";
export * from "./grid";
export * from "./content";
export * from "./faq";
export * from "./pricing";
export * from "./media";
