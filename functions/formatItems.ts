//@ts-ignore
import moment from 'moment';
export function formatItems(invoices : any[], caller : string, branchInfo : {ID : string, VALUE : string}[], paymentMethods : {ID : string, VALUE : string}[],courses : {CURRENCY : string, AMOUNT : number, AMOUNT_CNT : number, SOURCE : string }[],totalOpportunity : number){
    console.log(courses);
    let newTotalOpportunity : number = 0;
    caller = caller ? caller : 'create';

    const formatedInvoices : {closedate : number, paymentMethod : string, branch : string, opportunity : number}[] = invoices.map(item => {
        const foundBranch : {VALUE : string}= branchInfo.find(valueItem => +valueItem.ID === item.ufCrm_SMART_INVOICE_1729670614381);
        const foundPaymentMethod : {VALUE : string} = paymentMethods.find(valueItem => +valueItem.ID === item.ufCrm_SMART_INVOICE_1730028921271);
        const currency : {AMOUNT : number, AMOUNT_CNT : number, SOURCE : string} = courses.find(obj => obj.CURRENCY === item.currencyId);
        const calculatedCourse = !currency.SOURCE ? currency.AMOUNT / currency.AMOUNT_CNT : currency.AMOUNT;
        const opportunity : number = currency ? item.opportunity * calculatedCourse : item.opportunity;
        console.log(currency);
        newTotalOpportunity += opportunity;

        return {
            closedate: item.closedate ? moment(item.closedate).unix() : null, // Перевод в unix для сортировки
            paymentMethod: foundPaymentMethod ? foundPaymentMethod.VALUE : null,
            branch: foundBranch ? foundBranch.VALUE : null,
            opportunity: opportunity ? opportunity : 0,
        };
    });

    totalOpportunity = caller === 'update' ? totalOpportunity + newTotalOpportunity : newTotalOpportunity;
    return[formatedInvoices, totalOpportunity];
}
