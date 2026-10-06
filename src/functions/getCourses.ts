export async function getCourses(courses: Array<{ CURRENCY: string }>) {
    const currencies = courses.map(course => course.CURRENCY);
    const newCourses: number[] = [];
    const url = "https://www.cbr-xml-daily.ru/daily_json.js";
    try {
      const response = await fetch(url);
      const data = await response.json() as {
        Valute: Record<string, { Value: number; Nominal: number }>
      };
      let course: number;
      let nominal: number;
      for ( let i = 1; i < currencies.length; i++) {
        console.log(currencies[i]);
        course = data.Valute[currencies[i]].Value;
        nominal = data.Valute[currencies[i]].Nominal;
        newCourses.push(course / nominal);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    } finally {
        return newCourses;
    }
}
