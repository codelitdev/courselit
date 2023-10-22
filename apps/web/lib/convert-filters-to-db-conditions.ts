import { UserFilter } from '../models/UserFilter';

export default function convertFiltersToDBConditions(filters: UserFilter[]):
    Record<string, unknown> {
    const dbFilters = [];

    for (let filter of filters) {
        console.log(filter)
        const { name, condition, value } = filter;
        if (name === "email") {  
            const emailCondition = {email: undefined}
            if (condition === 'Is exactly') {
                emailCondition.email = value
            }
            if (condition === 'Contains') {
                emailCondition.email = {$regex: value, $options: 'i'}
            }
            if (condition === 'Does not contain') {
                emailCondition.email = {$not: {$regex: value, $options: 'i'}}
            }
            dbFilters.push(emailCondition)
        }
    }

    return {$and: dbFilters};
}
