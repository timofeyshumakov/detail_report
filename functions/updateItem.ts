interface Field {
    title: string | null
    value: string | null
    maxGrade: string | null
}

const updateItem = (item: Field) => {

    if (item.value.startsWith('0') && item.value.length > 1) {
      item.value = item.value.replace(/^0+/, '');
    }

    const regex = /[^0-9]/g;
    item.value = item.value.replaceAll(regex, '');
    if (item.value > item.maxGrade) {
      item.value = item.maxGrade;
    }

}