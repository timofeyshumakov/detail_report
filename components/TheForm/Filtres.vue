<template lang="pug">
    Date(
        :showInput="showInput"
        :selectedDateIso="selectedDateIso"
    )
    v-autocomplete(
                v-model="selectedUsers"
                :items="users"
                item-title="FULL_NAME"
                item-value="ID"
                label="Исполнитель"
                single-line
                hide-details
                variant="outlined"
                multiple
                chips
                clearable
    )
        template(v-slot:prepend-item)
                  v-list-item
                    v-list-item-content
                      v-list-item-title
                        v-checkbox(
                            label="Выбрать все статусы" :modelValue="selectedAllUsers" @change="toggleSelectAll()"
                        )
</template>

<script lang="js">
import Date from './Date/Date.vue';
import { useParseStore } from '../../stores/store.js'; 
import { useMyStore } from '../../stores/store.js'; 

export default {
    components: { Date },
    props: {
        branchInfo: {},
        selectedPaymentMethods: {},
        paymentMethods: {},
        selectedDateIso: {},
        users: {},
    },
    data() {
        const myStore = useMyStore();
        const parseStore = useParseStore();
        return {
            showInput: [false, false, false, false, false, false],
            selectedBranches: [],
            selectedPaymentMethods: [],
            selectAllBranches: false,
            branchInfo: this.branchInfo,
            branchIds: [],
            selectAllPaymentMethods: false,
            paymentMethods: this.paymentMethods,
            selectedDateIso: [null, null],
            parseStore,
            myStore,
            invoices: myStore,
            selectedAllUsers: true,
            userIds: this.users.map(user => user.ID),
            selectedUsers: [],
        }
    },
    computed: {

    },
    methods: {
        submit(){
            console.log(this.selectedDateIso[0]);
            this.parseStore.setFilter(">closedate", this.selectedDateIso[0]);
            this.parseStore.setFilter("<closedate", this.selectedDateIso[1]);
            this.parseStore.setFilter("categoryId", "69");
            this.parseStore.setFilter("ufCrm_47_1700468491", this.selectedUsers);
            this.parseStore.setFilter("!ufCrm_47_1752752059810", null);
        },
        toggleSelectAll() {
            console.log(this.selectedAllUsers);
            if(this.selectedAllUsers){
                this.selectedAllUsers = false;
                this.selectedUsers = [];
            }else{
                this.selectedUsers = this.userIds;
                this.selectedAllUsers = true;
                console.log(this.selectedAllUsers);
            }
        },
        clearUsesr() {
            this.selectedAllUsers = false;
        },
        toggleSelectAllBranches() {
            if(this.selectAllBranches){
                this.selectAllBranches = false;
                this.selectedBranches = [];
            }else{
                this.selectAllBranches = true;
                this.selectedBranches = this.branchIds;
            }
            //
        },
        clearBranches() {
            this.selectAllBranches = false;
        },
        
    },
    watch: {
        selectedBranches(value){
            console.log(value);
            this.$emit('update:selectedBranches', value);
        },
        selectedPaymentMethods(value){
            this.$emit('update:selectedPaymentMethods', value);
        }
    },
    created() {
        this.userIds = this.users.map(u => u.ID);
        this.selectedUsers = [...this.userIds];
    }
}
</script>
<style lang="sass">
  .v-field__field
    max-height: 7rem
    overflow: hidden
</style>