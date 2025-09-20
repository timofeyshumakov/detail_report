export async function getCourses(courses){
    const currencies = courses.map(course => course.CURRENCY);
    const newCourses = [];
    const url = "https://www.cbr-xml-daily.ru/daily_json.js";
    try {
      const response = await fetch(url);
      const data = await response.json();
      let course;
      let nominal;
      for ( let i = 1; i < currencies.length; i++) {
        console.log(currencies[i]);
        course = data.Valute[currencies[i]].Value;
        nominal = data.Valute[currencies[i]].Nominal;
        newCourses.push(course / nominal);
      }
    } catch (error) {
      console.error(error.message);
    } finally {
        return newCourses;
    }
}
